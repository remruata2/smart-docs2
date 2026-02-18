"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateQuiz, gradeQuiz, QuizGenerationConfig } from "@/lib/ai-service-enhanced";
import { QuestionType, QuizStatus } from "@/generated/prisma";
import { quizCache, CacheKeys } from "@/lib/quiz-cache";
import { checkAIFeatureAccess } from "@/lib/trial-access";


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

    // Use shared service
    // Note: checkAIFeatureAccess is now handled in the service too to ensure consistency
    // But wait, the service does internal checks. We can pass the userId.

    // However, the original code had an early check for trial access in the action.
    // The service now has it.

    // We also need to make sure we import quizService
    const { quizService } = await import("@/lib/quiz-service");

    return quizService.generateQuiz(
        userId,
        subjectId,
        chapterId,
        difficulty,
        questionCount,
        questionTypes,
        useAiFallback
    );
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

    const { quizService } = await import("@/lib/quiz-service");

    return quizService.submitQuiz(userId, quizId, answers);
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

        // Get quiz count (Tests Completed)
        const quizCount = await prisma.quiz.count({
            where: { user_id: userId, status: "COMPLETED" },
        });

        // Get average score (Accuracy)
        const quizzes = await prisma.quiz.findMany({
            where: { user_id: userId, status: "COMPLETED" },
            select: { score: true, total_points: true },
        });
        const avgPercentage = quizzes.length > 0
            ? quizzes.reduce((sum, q) => sum + (q.score / q.total_points) * 100, 0) / quizzes.length
            : 0;

        // Get Battles Won
        // We count where the user was a participant in a COMPLETED battle and their rank is 1
        // Note: Battle rank is calculated in application logic usually, but let's check if we store it or can infer it.
        // The mobile app uses `battles_won`.
        // In the current schema, BattleParticipant has `score` and `finished`.
        // We might not have a direct `rank` stored in `BattleParticipant` unless added recently.
        // Let's check `BattleParticipant` schema via what we know or assume standard logic.
        // Actually, `BattleResult.tsx` calculates rank on the fly.
        // To do this efficiently in SQL/Prisma without fetching all battles:
        // We can fetch all COMPLETED battles where user participated, and for each, check if they are the winner.
        // Or simpler: strictly counting wins might be expensive if done purely in JS for many battles.
        // However, for now, let's fetch completed battles and check ranks.

        const completedBattles = await prisma.battle.findMany({
            where: {
                status: "COMPLETED",
                participants: {
                    some: { user_id: userId }
                }
            },
            include: {
                participants: {
                    select: { user_id: true, score: true, completed_at: true }
                }
            }
        });

        let battlesWon = 0;
        completedBattles.forEach(battle => {
            // Sort participants to find winner
            const sorted = battle.participants.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const aTime = a.completed_at ? new Date(a.completed_at).getTime() : Infinity;
                const bTime = b.completed_at ? new Date(b.completed_at).getTime() : Infinity;
                return aTime - bTime;
            });

            if (sorted.length > 0 && sorted[0].user_id === userId) {
                battlesWon++;
            }
        });

        // Calculate Streak (reusing logic from dashboard/actions if possible, or simple version here)
        // For simplicity, let's query UserPoints for recent activity
        // Or just use the existing logic if we want to be consistent

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

            // New fields for Practice Dashboard
            tests_completed: quizCount,
            accuracy: Math.round(avgPercentage),
            battles_won: battlesWon,
            total_points: totalPoints,
            current_streak: 0,

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
