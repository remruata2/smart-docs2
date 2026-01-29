"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export type LeaderboardScope = "BOARD" | "INSTITUTION";
export type LeaderboardMetric = "POINTS" | "AVG_SCORE";

export interface LeaderboardEntry {
    rank: number;
    userId: number;
    username: string;
    avatarUrl?: string | null;
    value: number; // Points or Avg Score
    isCurrentUser: boolean;
}

export type LeaderboardTimeframe = "weekly" | "monthly" | "all_time";

export async function getLeaderboardData(
    scope: "COURSE", // Force strict typing to COURSE only
    metric: LeaderboardMetric,
    courseId?: number,
    timeframe: LeaderboardTimeframe = "weekly"
): Promise<{ entries: LeaderboardEntry[]; currentUserRank: number | null; userContext: any } | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // 1. Get current enrollment context
    const currentEnrollment = await prisma.userEnrollment.findFirst({
        where: {
            user_id: userId,
            status: "active",
            ...(courseId ? { course_id: courseId } : {})
        },
        include: {
            course: {
                include: {
                    subjects: true // Need subjects to filter battles
                }
            },
            user: {
                select: {
                    username: true,
                },
            },
        },
        orderBy: { last_accessed_at: "desc" }
    });

    if (!currentEnrollment || !currentEnrollment.course) {
        return null;
    }

    const activeCourseId = courseId || currentEnrollment.course_id;
    const courseSubjectIds = currentEnrollment.course.subjects.map(s => s.id);

    // 2. Define Target Users (Enrolled in Course)
    const enrollments = await prisma.userEnrollment.findMany({
        where: {
            course_id: activeCourseId,
            status: "active"
        },
        select: { user_id: true }
    });
    const targetUserIds = enrollments.map(e => e.user_id);

    let entries: LeaderboardEntry[] = [];

    // 3. Aggregate Data based on Metric (Battle Points ONLY)
    // Fetch usernames for target users
    const users = await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: {
            id: true,
            username: true,
            image: true
        }
    });

    if (metric === "POINTS") {
        // Date Logic
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let createdAfter: Date | undefined;

        if (timeframe === 'weekly') {
            const day = now.getDay() || 7; // Get current day number, make Sunday 7
            if (day !== 1) now.setHours(-24 * (day - 1)); // Set to previous Monday
            now.setHours(0, 0, 0, 0);
            createdAfter = now;
        } else if (timeframe === 'monthly') {
            createdAfter = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        // 'all_time' -> createdAfter is undefined

        const dateFilter = createdAfter ? {
            created_at: {
                gte: createdAfter
            }
        } : {};

        // Aggregate points from BattleParticipant
        // Filter by battles linked to subjects in this course AND timeframe
        const battlePointsAgg = await prisma.battleParticipant.groupBy({
            by: ['user_id'],
            where: {
                user_id: { in: targetUserIds },
                battle: {
                    quiz: {
                        subject_id: { in: courseSubjectIds }
                    },
                    status: 'COMPLETED',
                    ...dateFilter
                }
            },
            _sum: {
                points_change: true
            },
        });

        const pointsMap = new Map(battlePointsAgg.map(p => [p.user_id, p._sum.points_change || 0]));

        // Filter out users who have no points record (didn't play) or have 0 points total
        // The user explicitly asked "all 0 points must not be on the list"
        const validUserIds = battlePointsAgg
            .filter(p => (p._sum.points_change || 0) !== 0)
            .map(p => p.user_id);

        // Add current user if they have 0 points? Usually yes for "Your Rank", but maybe not for the list.
        // LeaderboardEntry usually implies the public list.
        // Let's filter the public list to non-zero.

        entries = users
            .filter(u => pointsMap.has(u.id) && pointsMap.get(u.id) !== 0)
            .map(u => ({
                rank: 0,
                userId: u.id,
                username: u.username || "Unknown",
                avatarUrl: u.image,
                value: pointsMap.get(u.id) || 0,
                isCurrentUser: u.id === userId
            }));

        // If current user is not in entries (because 0 points), we might need to handle currentUserRank differently
        // But the return type allows currentUserRank to be null.

    } else if (metric === "AVG_SCORE") {
        // Keep AVG_SCORE as Quiz based? Or remove?
        // User request: "both leaderboards... should count the points achieved from battle mode only"
        // Interpretation: The main POINTS leaderboard is now Battle Only.
        // For AVG_SCORE, if we keep it, it should probably be Battle Average too?
        // Let's stick to Quizzes for AVG_SCORE for now as "Average Score" implies test performance, 
        // whereas "Points" implies the gamified Battle Points.
        // If user wants EVERYTHING battle only, I should change this too.
        // "points achieved from battle mode only" -> This strongly targets the "Points" metric.
        // I will leave AVG_SCORE on Quizzes for now to populate that tab, otherwise it might be empty if no battles played.

        const quizzes = await prisma.quiz.findMany({
            where: {
                user_id: { in: targetUserIds },
                status: "COMPLETED",
                total_points: { gt: 0 }
            },
            select: {
                user_id: true,
                score: true,
                total_points: true
            }
        });

        const userScoreSums = new Map<number, { sumPct: number, count: number }>();
        quizzes.forEach(q => {
            const pct = (q.score / q.total_points) * 100;
            const current = userScoreSums.get(q.user_id) || { sumPct: 0, count: 0 };
            userScoreSums.set(q.user_id, {
                sumPct: current.sumPct + pct,
                count: current.count + 1
            });
        });

        entries = users.map(u => {
            const stats = userScoreSums.get(u.id);
            const avg = stats && stats.count > 0 ? Math.round(stats.sumPct / stats.count) : 0;
            return {
                rank: 0,
                userId: u.id,
                username: u.username || "Unknown",
                avatarUrl: u.image,
                value: avg,
                isCurrentUser: u.id === userId
            };
        });
    }

    // 4. Sort and Assign Ranks
    entries.sort((a, b) => b.value - a.value);

    // Find current user's rank before slicing
    const userIndex = entries.findIndex(e => e.userId === userId);
    const currentUserRank = userIndex !== -1 ? userIndex + 1 : null;

    // Take top 100 and assign ranks
    const topEntries = entries.slice(0, 100).map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));

    return {
        entries: topEntries,
        currentUserRank,
        userContext: {
            courseTitle: currentEnrollment.course.title,
        }
    };
}
