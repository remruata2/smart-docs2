
import { prisma } from "@/lib/prisma";
import { generateQuiz, gradeQuiz, QuizGenerationConfig } from "@/lib/ai-service-enhanced";
import { QuestionType, QuizStatus } from "@/generated/prisma";
import { quizCache, CacheKeys } from "@/lib/quiz-cache";
import { checkAIFeatureAccess } from "@/lib/trial-access";

/**
 * Get chapter context with caching
 */
async function getChapterContext(chapterId: number): Promise<{ title: string; context: string; board?: string; level?: string; examCategory?: string }> {
    const cacheKey = CacheKeys.chapterContext(chapterId);
    const cached = quizCache.get<{ title: string; context: string; board?: string; level?: string; examCategory?: string }>(cacheKey);

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
                            exam_category: true,
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
        level: chapter.subject?.program?.name,
        examCategory: chapter.subject?.program?.exam_category || undefined
    };

    // Cache for 1 hour
    quizCache.set(cacheKey, result, 60 * 60 * 1000);

    return result;
}

/**
 * Get subject-level context with random chapter sampling
 */
async function getSubjectContext(subjectId: number): Promise<{ context: string; board?: string; level?: string; examCategory?: string }> {
    const cacheKey = CacheKeys.subjectContext(subjectId);
    const cached = quizCache.get<{ context: string; board?: string; level?: string; examCategory?: string }>(cacheKey);

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
                    exam_category: true,
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
        level: subject?.program?.name,
        examCategory: subject?.program?.exam_category || undefined
    };

    // Cache for 30 minutes (less than chapter since it's random)
    quizCache.set(cacheKey, result, 30 * 60 * 1000);

    return result;
}

export const quizService = {
    async generateQuiz(
        userId: number,
        subjectId: number | null,
        chapterId: number | null,
        difficulty: "easy" | "medium" | "hard" | "exam",
        questionCount: number,
        questionTypes: QuestionType[],
        useAiFallback: boolean = true
    ) {
        // If no subject provided (Quick Quiz), pick a random active subject
        if (!subjectId) {
            const randomSubject = await prisma.subject.findFirst({
                // You might want to filter by user's enrolled program/board if applicable
                // For now, simple random active subject
                // distinct: ['id']?? No.
                // skip: Math.floor(Math.random() * count) ?? 
                // Prisma doesn't support random native easily. 
                // Let's fetch IDs and pick one.
                select: { id: true },
                where: { is_active: true, created_by_user_id: null }
            });

            // Better: Get all active subjects and pick one
            const subjects = await prisma.subject.findMany({
                where: { is_active: true, created_by_user_id: null },
                select: { id: true }
            });

            if (subjects.length > 0) {
                const randomIndex = Math.floor(Math.random() * subjects.length);
                subjectId = subjects[randomIndex].id;
                console.log(`[QUIZ-GEN] Quick Quiz: Selected random subject ID ${subjectId}`);
            } else {
                throw new Error("No active subjects available for quiz.");
            }
        }

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
            if (chapterId || subjectId) {
                // Build query filter
                const whereClause: any = {
                    is_active: true,
                };

                if (chapterId) {
                    whereClause.chapter_id = BigInt(chapterId);

                    // Validation: Ensure chapter allows quizzes
                    const chapter = await prisma.chapter.findUnique({
                        where: { id: BigInt(chapterId) },
                        select: { quizzes_enabled: true, subject: { select: { quizzes_enabled: true } } }
                    });

                    if (chapter && (!chapter.quizzes_enabled || !chapter.subject.quizzes_enabled)) {
                        throw new Error("Quizzes are disabled for this chapter.");
                    }
                } else if (subjectId) {
                    whereClause.chapter = { subject_id: subjectId };

                    // Validation: Ensure subject allows quizzes
                    const subject = await prisma.subject.findUnique({
                        where: { id: subjectId },
                        select: { quizzes_enabled: true }
                    });

                    if (subject && !subject.quizzes_enabled) {
                        throw new Error("Quizzes are disabled for this subject.");
                    }
                }

                // If difficulty is "exam", ONLY fetch exam questions and ignore types
                if (difficulty === "exam") {
                    whereClause.difficulty = "exam";
                } else {
                    whereClause.question_type = { in: questionTypes };
                    whereClause.difficulty = { in: [difficulty, "exam"] };
                }

                let availableQuestions = await prisma.question.findMany({
                    where: whereClause,
                    select: { id: true }
                });

                // FALLBACK STRATEGY: Not enough specific questions, try ANY difficulty from bank
                if (difficulty !== "exam" && availableQuestions.length < questionCount) {
                    console.log(`[QUIZ-GEN] Not enough ${difficulty} questions in bank. Trying all available difficulties...`);
                    const allQuestions = await prisma.question.findMany({
                        where: {
                            ...(chapterId ? { chapter_id: BigInt(chapterId) } : { chapter: { subject_id: subjectId! } }),
                            question_type: { in: questionTypes },
                            is_active: true
                        },
                        select: { id: true }
                    });

                    const existingIds = new Set(availableQuestions.map(q => q.id));
                    for (const q of allQuestions) {
                        if (!existingIds.has(q.id)) {
                            availableQuestions.push(q);
                            existingIds.add(q.id);
                        }
                    }
                }

                if (availableQuestions.length >= questionCount || (difficulty === "exam" && availableQuestions.length > 0)) {
                    console.log(`[QUIZ-GEN] Found ${availableQuestions.length} questions in bank. Using Bank.`);

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

                    if (chapterId) {
                        const chapter = await prisma.chapter.findUnique({
                            where: { id: BigInt(chapterId) },
                            select: { title: true }
                        });
                        quizTitle = `${chapter?.title || 'Chapter'} Quiz`;
                        quizDescription = `A ${difficulty} difficulty quiz on ${chapter?.title}`;
                    } else {
                        const subject = await prisma.subject.findUnique({
                            where: { id: subjectId! },
                            select: { name: true }
                        });
                        quizTitle = `${subject?.name || 'Subject'} Mixed Review`;
                        quizDescription = `A mixed ${difficulty} difficulty quiz covering all chapters of ${subject?.name}`;
                    }
                } else {
                    console.log(`[QUIZ-GEN] Not enough questions in bank (${availableQuestions.length}/${questionCount}). Fallback to AI.`);
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
                let examCategoryName = "";

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
                    examCategoryName = chapterData.examCategory || "";
                } else {
                    topicName = "General Review";
                    const subjectData = await getSubjectContext(subjectId);
                    context = subjectData.context;
                    boardName = subjectData.board || "";
                    levelName = subjectData.level || "";
                    examCategoryName = subjectData.examCategory || "";
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
                    level: levelName,
                    examCategory: examCategoryName || undefined
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
            console.error("Error in generateQuiz:", error);
            throw new Error(error.message || "Failed to generate quiz");
        }
    },

    async submitQuiz(
        userId: number,
        quizId: string,
        answers: Record<string, any> // questionId -> answer
    ) {
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
                    // Normalize to lowercase for case-insensitive comparison
                    const correctSet = new Set(correctArray.map((a: any) => String(a).trim().toLowerCase()));
                    const userSet = new Set(userArray.map((a: any) => String(a).trim().toLowerCase()));

                    // Check if sets are equal (works for single-select AND multi-select)
                    if (correctSet.size === userSet.size &&
                        [...correctSet].every(item => userSet.has(item))) {
                        isCorrect = true;
                        pointsAwarded = question.points;
                    } else if ((question.question_type as string) === "FILL_IN_BLANK") {
                        // FALLBACK: If strict match fails, try AI grading for Fill in the Blanks
                        // This handles cases like "domain" vs "Domain Name"
                        questionsToGrade.push({
                            id: question.id,
                            question_text: question.question_text,
                            user_answer: String(userAnswer),
                            correct_answer: String(question.correct_answer),
                            type: question.question_type,
                            max_points: question.points,
                        });
                        continue; // Skip immediate update
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

            // Fetch full questions with results for the final response
            const gradedQuestions = await prisma.quizQuestion.findMany({
                where: { quiz_id: quizId },
                select: {
                    id: true,
                    question_text: true,
                    question_type: true,
                    options: true,
                    correct_answer: true,
                    user_answer: true,
                    is_correct: true,
                    points: true,
                    explanation: true,
                    feedback: true,
                }
            });

            return {
                success: true,
                score: totalScore,
                totalPoints: quiz.total_points,
                questions: gradedQuestions
            };

        } catch (error: any) {
            console.error("[QUIZ-SERVICE] Error submitting quiz:", error);
            if (error.stack) console.error(error.stack);
            throw new Error(error.message || "Failed to submit quiz");
        }
    }
}
