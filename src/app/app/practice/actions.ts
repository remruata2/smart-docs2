"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateQuiz, gradeQuiz, QuizGenerationConfig } from "@/lib/ai-service-enhanced";
import { QuestionType, QuizStatus } from "@/generated/prisma";
import { quizCache, CacheKeys } from "@/lib/quiz-cache";
import { checkAIFeatureAccess } from "@/lib/trial-access";

/**
 * Get chapter context with caching
 */
/**
 * Get chapter context with caching
 */
async function getChapterContext(chapterId: number): Promise<{ title: string; context: string; board?: string; level?: string }> {
    const cacheKey = CacheKeys.chapterContext(chapterId);
    const cached = quizCache.get<{ title: string; context: string; board?: string; level?: string }>(cacheKey);

    if (cached) {
        console.log(`[QUIZ-CACHE] Hit for chapter ${chapterId}`);
        return cached;
    }

    console.log(`[QUIZ-CACHE] Miss for chapter ${chapterId}, fetching from DB`);

    // Fetch chapter metadata with relations
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        select: {
            title: true,
            subject: {
                select: {
                    program: {
                        select: {
                            name: true,
                            board: {
                                select: { id: true }
                            }
                        }
                    }
                }
            }
        },
    });

    if (!chapter) throw new Error("Chapter not found");

    // Fetch all chunks for this chapter (this is where the actual content is!)
    const chunks = await prisma.chapterChunk.findMany({
        where: { chapter_id: BigInt(chapterId) },
        select: { content: true, chunk_index: true },
        orderBy: { chunk_index: 'asc' },
    });

    console.log(`[QUIZ-CACHE] Found ${chunks.length} chunks for chapter ${chapterId}`);

    // Concatenate all chunk content
    const context = chunks.map(chunk => chunk.content).join("\n\n");

    console.log(`[QUIZ-CACHE] Total context length: ${context.length} characters`);

    const result = {
        title: chapter.title,
        context,
        board: chapter.subject?.program?.board?.id,
        level: chapter.subject?.program?.name
    };

    // Cache for 1 hour
    quizCache.set(cacheKey, result, 60 * 60 * 1000);

    return result;
}

/**
 * Get subject-level context with random chapter sampling
 */
/**
 * Get subject-level context with random chapter sampling
 */
async function getSubjectContext(subjectId: number): Promise<{ context: string; board?: string; level?: string }> {
    const cacheKey = CacheKeys.subjectContext(subjectId);
    const cached = quizCache.get<{ context: string; board?: string; level?: string }>(cacheKey);

    if (cached) {
        console.log(`[QUIZ-CACHE] Hit for subject ${subjectId}`);
        return cached;
    }

    console.log(`[QUIZ-CACHE] Miss for subject ${subjectId}, fetching from DB`);

    // Fetch Subject Metadata
    const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: {
            program: {
                select: {
                    name: true,
                    board: { select: { id: true } }
                }
            }
        }
    });

    // Get all chapter IDs, then randomly sample 3
    const chapterIds = await prisma.chapter.findMany({
        where: { subject_id: subjectId, is_active: true },
        select: { id: true },
    });

    if (chapterIds.length === 0) {
        throw new Error("No chapters found for subject");
    }

    // Random sampling
    const sampleSize = Math.min(3, chapterIds.length);
    const shuffled = [...chapterIds].sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, sampleSize).map(c => c.id);

    console.log(`[QUIZ-CACHE] Sampling ${sampleSize} chapters for subject context`);

    // Fetch chunks from selected chapters
    const chunks = await prisma.chapterChunk.findMany({
        where: { chapter_id: { in: selectedIds } },
        select: { content: true, chunk_index: true, chapter_id: true },
        orderBy: [
            { chapter_id: 'asc' },
            { chunk_index: 'asc' }
        ],
    });

    console.log(`[QUIZ-CACHE] Found ${chunks.length} total chunks from ${sampleSize} chapters`);

    const context = chunks.map(c => c.content).join("\n\n");

    const result = {
        context,
        board: subject?.program?.board?.id,
        level: subject?.program?.name
    };

    // Cache for 30 minutes (less than chapter since it's random)
    quizCache.set(cacheKey, result, 30 * 60 * 1000);

    return result;
}


export async function generateQuizAction(
    subjectId: number,
    chapterId: number | null,
    difficulty: "easy" | "medium" | "hard" | "exam",
    questionCount: number,
    questionTypes: QuestionType[],
    useAiFallback: boolean = true // New parameter, defaults to true for backward compatibility
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }
    const userId = parseInt(session.user.id as string);

    // Check trial access for AI features
    if (chapterId) {
        const access = await checkAIFeatureAccess(userId, chapterId, prisma);
        if (!access.allowed) {
            throw new Error(access.reason || "Trial access restricted");
        }
    }

    try {
        let quizTitle = "";
        let quizDescription = "";
        let finalQuestions: any[] = [];

        // STRATEGY 1: Question Bank (Priority)
        if (chapterId) {
            const bigChapterId = BigInt(chapterId);

            // Build query filter
            const whereClause: any = {
                chapter_id: bigChapterId,
                is_active: true,
            };

            // If difficulty is "exam", ONLY fetch exam questions and ignore types
            if (difficulty === "exam") {
                whereClause.difficulty = "exam";
                // We intentionally ignore questionTypes for exam mode to get all available past paper questions
            } else {
                // Normal mode: filter by selected types and difficulty + exam questions
                whereClause.question_type = { in: questionTypes };
                // Include both selected difficulty AND exam questions (as they are high quality)
                whereClause.difficulty = { in: [difficulty, "exam"] };
            }

            let availableQuestions = await prisma.question.findMany({
                where: whereClause,
                select: { id: true }
            });

            // For Exam Mode, we strictly require questions from the bank
            if (difficulty === "exam") {
                if (availableQuestions.length === 0) {
                    throw new Error("No exam questions found for this chapter. Please upload past papers first.");
                }
                // Use all found questions (up to limit)
                console.log(`[QUIZ-GEN] Found ${availableQuestions.length} exam questions.`);
            }

            // FALLBACK STRATEGY: If strict mode (no AI) and not enough questions, try ANY difficulty
            // This block is only relevant for non-exam difficulties if useAiFallback is false
            if (difficulty !== "exam" && availableQuestions.length < questionCount && !useAiFallback) {
                console.log(`[QUIZ-GEN] Not enough ${difficulty} questions. Trying ALL difficulties from bank...`);
                const allDifficultyQuestions = await prisma.question.findMany({
                    where: {
                        chapter_id: bigChapterId,
                        question_type: { in: questionTypes },
                        is_active: true
                    },
                    select: { id: true }
                });
                // Add unique ones
                const existingIds = new Set(availableQuestions.map(q => q.id));
                for (const q of allDifficultyQuestions) {
                    if (!existingIds.has(q.id)) {
                        availableQuestions.push(q);
                        existingIds.add(q.id);
                    }
                }
            }

            if (availableQuestions.length >= questionCount || (difficulty === "exam" && availableQuestions.length > 0)) {
                console.log(`[QUIZ-GEN] Found ${availableQuestions.length} questions in bank for chapter ${chapterId}. Using Bank.`);

                // Randomly select IDs
                const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
                const selectedIds = shuffled.slice(0, questionCount).map(q => q.id);

                // Fetch full question details
                const questions = await prisma.question.findMany({
                    where: { id: { in: selectedIds } }
                });

                finalQuestions = questions.map(q => ({
                    question_text: q.question_text,
                    question_type: q.question_type,
                    options: q.options ? (q.options as any) : undefined,
                    correct_answer: q.correct_answer,
                    points: q.points,
                    explanation: q.explanation || "Correct answer",
                }));

                const chapter = await prisma.chapter.findUnique({
                    where: { id: bigChapterId },
                    select: { title: true }
                });

                quizTitle = `${chapter?.title || 'Chapter'} Quiz`;
                quizDescription = `A ${difficulty} difficulty quiz on ${chapter?.title}`;
            } else {
                console.log(`[QUIZ-GEN] Not enough questions in bank (${availableQuestions.length}/${questionCount}).`);

                if (!useAiFallback) {
                    throw new Error(`Not enough questions in the Question Bank for this chapter. Found ${availableQuestions.length}, needed ${questionCount}. Please contact admin.`);
                }

                console.log(`[QUIZ-GEN] Falling back to AI.`);
            }
        }

        // STRATEGY 2: AI Generation (Fallback or Subject-level)
        if (finalQuestions.length === 0) {
            if (!useAiFallback) {
                throw new Error("AI generation is disabled for this request (Battle Mode). Please select a chapter with existing questions.");
            }

            // 1. Fetch Context (with caching)
            let context = "";
            let topicName = "";
            let boardName = "";
            let levelName = "";

            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
                select: { name: true },
            });
            if (!subject) throw new Error("Subject not found");
            const subjectName = subject.name;

            if (chapterId) {
                const chapterData = await getChapterContext(chapterId);
                topicName = chapterData.title;
                context = chapterData.context;
                boardName = chapterData.board || "";
                levelName = chapterData.level || "";
            } else {
                topicName = "General Review";
                const subjectData = await getSubjectContext(subjectId);
                context = subjectData.context;
                boardName = subjectData.board || "";
                levelName = subjectData.level || "";
            }

            // Early validation
            if (!context || context.trim().length < 200) {
                throw new Error("Insufficient content available for quiz generation. Please ensure the chapter has content.");
            }

            // 2. Generate Quiz via AI
            const config: QuizGenerationConfig = {
                subject: subjectName,
                topic: topicName,
                difficulty: difficulty as any, // Cast to any since AI service might not strictly type "exam" yet
                questionCount,
                questionTypes: questionTypes as any, // Cast to match AI service types
                context,
            };

            const aiQuiz = await generateQuiz(config, {
                board: boardName,
                level: levelName
            });
            finalQuestions = aiQuiz.questions;
            quizTitle = aiQuiz.title;
            quizDescription = aiQuiz.description;

            // OPTIONAL: We could save these to the Question Bank here for future use!
            // But for now, we'll keep the existing behavior for AI generation.
        }

        // 3. Save to DB
        const quiz = await prisma.quiz.create({
            data: {
                user_id: userId,
                subject_id: subjectId,
                chapter_id: chapterId ? BigInt(chapterId) : null,
                title: quizTitle,
                description: quizDescription,
                total_points: finalQuestions.reduce((sum, q) => sum + q.points, 0),
                questions: {
                    create: finalQuestions.map(q => ({
                        question_text: q.question_text,
                        question_type: q.question_type as QuestionType,
                        options: q.options ? q.options : undefined,
                        correct_answer: q.correct_answer,
                        points: q.points,
                        explanation: q.explanation,
                    })),
                },
            },
            include: {
                questions: true,
            },
        });

        // Serialize BigInt for client
        return {
            ...quiz,
            chapter_id: quiz.chapter_id?.toString() || null,
            questions: quiz.questions.map(q => ({
                ...q,
                // Hide correct answer and explanation for the client!
                correct_answer: null,
                explanation: null,
            })),
        };

    } catch (error: any) {
        console.error("Error in generateQuizAction:", error);
        throw new Error(error.message || "Failed to generate quiz");
    }
}

export async function submitQuizAction(
    quizId: string,
    answers: Record<string, any> // questionId -> answer
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }
    const userId = parseInt(session.user.id as string);

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { questions: true },
        });

        if (!quiz) throw new Error("Quiz not found");
        if (quiz.user_id !== userId) throw new Error("Unauthorized");
        if (quiz.status === "COMPLETED") {
            return { success: true, score: quiz.score, totalPoints: quiz.total_points };
        }

        let totalScore = 0;
        const updates = [];
        const questionsToGrade = [];

        for (const question of quiz.questions) {
            const userAnswer = answers[question.id];
            let isCorrect = false;
            let pointsAwarded = 0;
            let feedback = null;

            if (["SHORT_ANSWER", "LONG_ANSWER"].includes(question.question_type)) {
                // Defer to AI grading
                questionsToGrade.push({
                    id: question.id,
                    question_text: question.question_text,
                    user_answer: String(userAnswer),
                    correct_answer: String(question.correct_answer),
                    type: question.question_type,
                    max_points: question.points,
                });
                continue; // Skip immediate update
            } else {
                // Auto-grade objective questions
                // Handle various answer formats: string vs array vs mixed

                const correctAnswer = question.correct_answer;
                const userAnswerNormalized = userAnswer;
                const correctAnswerNormalized = correctAnswer;

                // Normalize to arrays for comparison
                const userArray = Array.isArray(userAnswerNormalized) ? userAnswerNormalized : [userAnswerNormalized];
                const correctArray = Array.isArray(correctAnswerNormalized) ? correctAnswerNormalized : [correctAnswerNormalized];

                // Compare as sets (order-independent, handles both single and multi-select)
                const correctSet = new Set(correctArray.map((a: any) => String(a).trim()));
                const userSet = new Set(userArray.map((a: any) => String(a).trim()));

                // Check if sets are equal (works for single-select AND multi-select)
                if (correctSet.size === userSet.size &&
                    [...correctSet].every(item => userSet.has(item))) {
                    isCorrect = true;
                    pointsAwarded = question.points;
                }
            }

            totalScore += pointsAwarded;
            updates.push(
                prisma.quizQuestion.update({
                    where: { id: question.id },
                    data: {
                        user_answer: userAnswer,
                        is_correct: isCorrect,
                    },
                })
            );
        }

        // Run AI grading if needed
        if (questionsToGrade.length > 0) {
            const grades = await gradeQuiz(questionsToGrade);

            for (const grade of grades) {
                // Find original question to get ID and max points
                // The gradeQuiz returns array in same order or we need to match by text?
                // Better to pass ID through gradeQuiz or match by text.
                // gradeQuiz returns { question_text, is_correct, score_percentage, feedback }

                const originalQ = questionsToGrade.find(q => q.question_text === grade.question_text);
                if (originalQ) {
                    const points = Math.round((grade.score_percentage / 100) * originalQ.max_points);
                    totalScore += points;

                    updates.push(
                        prisma.quizQuestion.update({
                            where: { id: originalQ.id },
                            data: {
                                user_answer: originalQ.user_answer,
                                is_correct: grade.is_correct,
                                feedback: grade.feedback,
                            },
                        })
                    );
                }
            }
        }

        // Execute all question updates
        await prisma.$transaction(updates);

        // Update Quiz status and score
        const updatedQuiz = await prisma.quiz.update({
            where: { id: quizId },
            data: {
                status: "COMPLETED",
                score: totalScore,
                completed_at: new Date(),
            },
        });

        // Award User Points
        if (totalScore > 0) {
            await prisma.userPoints.create({
                data: {
                    user_id: userId,
                    points: totalScore,
                    reason: "quiz_completion",
                    metadata: { quiz_id: quizId, title: quiz.title },
                },
            });

            // Check for streak badges
            // We need to calculate streak AFTER adding the new point (activity)
            // But calculateStreak checks DB, so it should be fine.
            // Wait, calculateStreak checks created_at. The point we just added has now().
            // So it counts as today's activity.

            // Import dynamically to avoid circular deps if any (though unlikely here)
            const { calculateStreak, checkAndAwardBadges } = await import("@/lib/streak-service");
            const currentStreak = await calculateStreak(userId);
            await checkAndAwardBadges(userId, currentStreak);
        }

        return { success: true, score: totalScore, totalPoints: quiz.total_points };

    } catch (error) {
        console.error("Error submitting quiz:", error);
        throw new Error("Failed to submit quiz");
    }
}

export async function getLeaderboardAction(limit = 10) {
    try {
        // Aggregate points by user
        const leaderboard = await prisma.userPoints.groupBy({
            by: ['user_id'],
            _sum: {
                points: true,
            },
            orderBy: {
                _sum: {
                    points: 'desc',
                },
            },
            take: limit,
        });

        // Fetch user details
        const userIds = leaderboard.map(l => l.user_id);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }, // Add avatar if available
        });

        // Combine data
        return leaderboard.map(entry => {
            const user = users.find(u => u.id === entry.user_id);
            return {
                userId: entry.user_id,
                username: user?.username || "Unknown User",
                points: entry._sum.points || 0,
            };
        });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        throw new Error("Failed to fetch leaderboard");
    }
}

export async function getUserStatsAction() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }
    const userId = parseInt(session.user.id as string);

    try {
        // Get user's total points
        const userPointsResult = await prisma.userPoints.aggregate({
            where: { user_id: userId },
            _sum: { points: true },
        });
        const totalPoints = userPointsResult._sum.points || 0;

        // Get quiz count
        const quizCount = await prisma.quiz.count({
            where: { user_id: userId, status: "COMPLETED" },
        });

        // Get average score
        const quizzes = await prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            select: { score: true, total_points: true },
        });
        const avgPercentage = quizzes.length > 0
            ? quizzes.reduce((sum, q) => sum + (q.score / q.total_points) * 100, 0) / quizzes.length
            : 0;

        // Calculate user's rank
        const allUserPoints = await prisma.userPoints.groupBy({
            by: ['user_id'],
            _sum: { points: true },
            orderBy: { _sum: { points: 'desc' } },
        });
        const userRank = allUserPoints.findIndex(entry => entry.user_id === userId) + 1;

        // Get recent point history
        const recentPoints = await prisma.userPoints.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: 10,
            select: {
                points: true,
                reason: true,
                created_at: true,
                metadata: true,
            },
        });

        return {
            totalPoints,
            rank: userRank || null,
            quizCount,
            avgScore: Math.round(avgPercentage),
            recentPoints: recentPoints.map(p => ({
                ...p,
                created_at: p.created_at.toISOString(),
            })),
        };
    } catch (error) {
        console.error("Error fetching user stats:", error);
        throw new Error("Failed to fetch user stats");
    }
}

export async function getQuizHistory() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return null;
    }
    const userId = parseInt(session.user.id as string);

    try {
        const quizzes = await prisma.quiz.findMany({
            where: {
                user_id: userId,
                status: QuizStatus.COMPLETED,
            },
            include: {
                subject: { select: { name: true } },
                chapter: { select: { title: true } },
            },
            orderBy: { completed_at: 'desc' },
        });

        return quizzes;
    } catch (error) {
        console.error("Error fetching quiz history:", error);
        throw new Error("Failed to fetch quiz history");
    }
}
