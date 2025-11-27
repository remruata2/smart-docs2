"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateQuiz, gradeQuiz, QuizGenerationConfig } from "@/lib/ai-service-enhanced";
import { QuestionType, QuizStatus } from "@/generated/prisma";
import { quizCache, CacheKeys } from "@/lib/quiz-cache";

/**
 * Get chapter context with caching
 */
async function getChapterContext(chapterId: number): Promise<{ title: string; context: string }> {
    const cacheKey = CacheKeys.chapterContext(chapterId);
    const cached = quizCache.get<{ title: string; context: string }>(cacheKey);

    if (cached) {
        console.log(`[QUIZ-CACHE] Hit for chapter ${chapterId}`);
        return cached;
    }

    console.log(`[QUIZ-CACHE] Miss for chapter ${chapterId}, fetching from DB`);

    // Fetch chapter metadata
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        select: { title: true },
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

    const result = { title: chapter.title, context };

    // Cache for 1 hour
    quizCache.set(cacheKey, result, 60 * 60 * 1000);

    return result;
}

/**
 * Get subject-level context with random chapter sampling
 */
async function getSubjectContext(subjectId: number): Promise<string> {
    const cacheKey = CacheKeys.subjectContext(subjectId);
    const cached = quizCache.get<string>(cacheKey);

    if (cached) {
        console.log(`[QUIZ-CACHE] Hit for subject ${subjectId}`);
        return cached;
    }

    console.log(`[QUIZ-CACHE] Miss for subject ${subjectId}, fetching from DB`);

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

    // Cache for 30 minutes (less than chapter since it's random)
    quizCache.set(cacheKey, context, 30 * 60 * 1000);

    return context;
}


export async function generateQuizAction(
    subjectId: number,
    chapterId: number | null,
    difficulty: "easy" | "medium" | "hard",
    questionCount: number,
    questionTypes: QuestionType[]
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }
    const userId = parseInt(session.user.id as string);

    try {
        // 1. Fetch Context (with caching)
        let context = "";
        let topicName = "";

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
        } else {
            topicName = "General Review";
            context = await getSubjectContext(subjectId);
        }

        // Early validation
        if (!context || context.trim().length < 200) {
            throw new Error("Insufficient content available for quiz generation. Please ensure the chapter has content.");
        }

        // 2. Generate Quiz via AI
        const config: QuizGenerationConfig = {
            subject: subjectName,
            topic: topicName,
            difficulty,
            questionCount,
            questionTypes: questionTypes as any, // Cast to match AI service types
            context,
        };

        const aiQuiz = await generateQuiz(config);

        // 3. Save to DB
        const quiz = await prisma.quiz.create({
            data: {
                user_id: userId,
                subject_id: subjectId,
                chapter_id: chapterId ? BigInt(chapterId) : null,
                title: aiQuiz.title,
                description: aiQuiz.description,
                total_points: aiQuiz.questions.reduce((sum, q) => sum + q.points, 0),
                questions: {
                    create: aiQuiz.questions.map(q => ({
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

    } catch (error) {
        console.error("Error in generateQuizAction:", error);
        throw new Error("Failed to generate quiz");
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
                // Simple equality check for now. For arrays (multi-select), need better logic.
                // Assuming single select MCQ/TF/FITB for MVP.
                if (JSON.stringify(userAnswer) === JSON.stringify(question.correct_answer)) {
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
