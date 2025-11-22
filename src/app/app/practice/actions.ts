"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateQuiz, gradeQuiz, QuizGenerationConfig } from "@/lib/ai-service-enhanced";
import { QuestionType, QuizStatus } from "@prisma/client";

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
        // 1. Fetch Context
        let context = "";
        let subjectName = "";
        let topicName = "";

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            select: { name: true },
        });
        if (!subject) throw new Error("Subject not found");
        subjectName = subject.name;

        if (chapterId) {
            const chapter = await prisma.chapter.findUnique({
                where: { id: chapterId },
                select: { title: true, content_json: true },
            });
            if (!chapter) throw new Error("Chapter not found");
            topicName = chapter.title;
            // Extract text from content_json (assuming it's LlamaParse output)
            // For simplicity, we'll just JSON stringify it if it's complex, or expect a 'text' field
            // Adjust based on actual content_json structure. 
            // LlamaParse usually gives markdown.
            const content: any = chapter.content_json;
            context = content.text || content.markdown || JSON.stringify(content);
        } else {
            // Subject-level quiz: fetch summaries of all chapters? 
            // Or just pick random chapters? For now, let's limit to chapter-level or 
            // fetch first 5 chapters' content.
            topicName = "General Review";
            const chapters = await prisma.chapter.findMany({
                where: { subject_id: subjectId },
                take: 3, // Limit context
                select: { content_json: true },
            });
            context = chapters.map(c => {
                const content: any = c.content_json;
                return content.text || content.markdown || "";
            }).join("\n\n");
        }

        if (!context) {
            throw new Error("No content available to generate quiz");
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
        if (quiz.status === "COMPLETED") throw new Error("Quiz already completed");

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
