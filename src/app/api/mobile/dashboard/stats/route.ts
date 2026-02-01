import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-STATS] Incoming request: ${request.url}`);

    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        console.log(`[DEBUG-MOBILE-STATS] Authenticated user: ${user.email} (ID: ${userId})`);

        // Get completed quizzes count
        const quizzesCompleted = await prisma.quiz.count({
            where: {
                user_id: userId,
                status: 'COMPLETED'
            }
        });

        // Get total score and total points for accuracy calculation
        const quizAggregates = await prisma.quiz.aggregate({
            where: {
                user_id: userId,
                status: 'COMPLETED',
                total_points: { gt: 0 }
            },
            _sum: {
                score: true,
                total_points: true
            }
        });

        // Calculate accuracy percentage
        const totalScore = quizAggregates._sum.score || 0;
        const totalPoints = quizAggregates._sum.total_points || 0;
        const accuracy = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

        // Get battles won
        const battlesWon = await prisma.battle.count({
            where: {
                status: 'COMPLETED',
                participants: {
                    some: {
                        user_id: userId,
                        finished: true
                    }
                }
            }
        });

        // To properly count wins, we need to check if the user had highest score
        // For now, count battles where user participated and finished with higher score
        const completedBattles = await prisma.battle.findMany({
            where: {
                status: 'COMPLETED',
                participants: {
                    some: {
                        user_id: userId,
                        finished: true
                    }
                }
            },
            include: {
                participants: {
                    orderBy: { score: 'desc' }
                }
            }
        });

        // Count wins (user had highest score)
        let winsCount = 0;
        for (const battle of completedBattles) {
            if (battle.participants.length > 0 && battle.participants[0].user_id === userId) {
                winsCount++;
            }
        }

        // Get current streak (consecutive days with quiz activity)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentStreak = 0;
        let checkDate = new Date(today);

        for (let i = 0; i < 365; i++) { // Max 365 days to check
            const dayStart = new Date(checkDate);
            const dayEnd = new Date(checkDate);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const hasActivityOnDay = await prisma.quiz.count({
                where: {
                    user_id: userId,
                    status: 'COMPLETED',
                    completed_at: {
                        gte: dayStart,
                        lt: dayEnd
                    }
                }
            });

            if (hasActivityOnDay > 0) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0) {
                // If no activity today, check if yesterday had activity (streak not broken yet)
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break; // Streak broken
            }
        }

        // Get badges count
        const badgesCount = await prisma.userBadge.count({
            where: {
                user_id: userId
            }
        });

        const stats = {
            tests_completed: quizzesCompleted,
            accuracy: accuracy,
            battles_won: winsCount,
            total_points: totalScore,
            current_streak: currentStreak,
            badges_count: badgesCount,
        };

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-STATS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch stats" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
