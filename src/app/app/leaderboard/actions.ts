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

export async function getLeaderboardData(
    scope: LeaderboardScope,
    metric: LeaderboardMetric
): Promise<{ entries: LeaderboardEntry[]; currentUserRank: number | null; userContext: any } | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // 1. Get User Context (Program, Board, Institution)
    const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        include: {
            program: {
                include: {
                    board: true,
                },
            },
            institution: true,
            user: {
                select: {
                    username: true,
                },
            },
        },
    });

    if (!profile?.program_id) {
        return null; // User must be in a program to be on a leaderboard
    }

    const programId = profile.program_id;
    const boardId = profile.program?.board_id;
    const institutionId = profile.institution_id;

    // 2. Define Filter Conditions
    // Always filter by Program
    const whereClause: any = {
        program_id: programId,
    };

    // Filter by Scope
    if (scope === "INSTITUTION") {
        if (!institutionId) {
            return null; // Cannot show institution leaderboard if user has no institution
        }
        whereClause.institution_id = institutionId;
    } else if (scope === "BOARD") {
        // Implicitly filtered by program (which belongs to a board)
        // But we can ensure we only get users in this program
        // No extra filter needed beyond program_id as program is unique to board+level
    }

    let entries: LeaderboardEntry[] = [];

    // 3. Aggregate Data based on Metric
    if (metric === "POINTS") {
        // Aggregate UserPoints
        // We need to join UserPoints with Profile to filter by Program
        // Prisma doesn't support direct joins in groupBy easily with relations filters on the grouped table
        // So we fetch profiles first, then their points, or use raw query for performance.
        // For now, let's use Prisma's relation queries.

        // Fetch all profiles in this scope
        const profiles = await prisma.profile.findMany({
            where: whereClause,
            select: {
                user_id: true,
                user: {
                    select: {
                        username: true,
                        // avatar: true // Assuming avatar is on user or profile? Schema says user doesn't have avatar field explicitly in the snippet provided, but maybe it does? 
                        // Let's check schema again. User model has no avatar. Profile has no avatar. 
                        // Maybe it's not implemented yet? I'll leave it optional.
                    }
                },
                // We need to sum points for this user
                // But points are in UserPoints table linked to user_id
            },
        });

        // This is inefficient for large datasets (N+1), but okay for MVP. 
        // Better: GroupBy UserPoints where user.profile matches condition.

        // Let's try a more optimized approach using grouping on UserPoints
        // But UserPoints doesn't know about Program/Institution directly.
        // We need users who are in the target profiles.

        const userIds = profiles.map(p => p.user_id);

        const pointsAgg = await prisma.userPoints.groupBy({
            by: ['user_id'],
            where: {
                user_id: { in: userIds }
            },
            _sum: {
                points: true
            },
        });

        // Map back to entries
        const pointsMap = new Map(pointsAgg.map(p => [p.user_id, p._sum.points || 0]));

        entries = profiles.map(p => ({
            rank: 0, // Calculated later
            userId: p.user_id,
            username: p.user?.username || "Unknown",
            value: pointsMap.get(p.user_id) || 0,
            isCurrentUser: p.user_id === userId
        }));

    } else if (metric === "AVG_SCORE") {
        // Aggregate Quiz Scores
        // Average of (score / total_points) * 100

        const profiles = await prisma.profile.findMany({
            where: whereClause,
            select: {
                user_id: true,
                user: { select: { username: true } }
            }
        });

        const userIds = profiles.map(p => p.user_id);

        // Fetch all completed quizzes for these users
        // We want average percentage.
        // Prisma groupBy doesn't do complex math like avg(score/total).
        // We might need raw query or fetch and calculate.
        // Fetching all quizzes is heavy. 
        // Let's fetch aggregated sums of score and total_points per user?
        // No, sum(score)/sum(total) != avg(score/total).
        // Example: 10/10 (100%) and 0/100 (0%) -> Avg 50%. Sum: 10/110 (9%).

        // For MVP, let's fetch quizzes and calculate in memory (careful with scale).
        // Or just use total score for now? The requirement says "average score".
        // Let's try to be accurate.

        const quizzes = await prisma.quiz.findMany({
            where: {
                user_id: { in: userIds },
                status: "COMPLETED",
                total_points: { gt: 0 } // Avoid division by zero
            },
            select: {
                user_id: true,
                score: true,
                total_points: true
            }
        });

        const userScores = new Map<number, { sumPct: number, count: number }>();

        quizzes.forEach(q => {
            const pct = (q.score / q.total_points) * 100;
            const current = userScores.get(q.user_id) || { sumPct: 0, count: 0 };
            userScores.set(q.user_id, {
                sumPct: current.sumPct + pct,
                count: current.count + 1
            });
        });

        entries = profiles.map(p => {
            const stats = userScores.get(p.user_id);
            const avg = stats && stats.count > 0 ? Math.round(stats.sumPct / stats.count) : 0;
            return {
                rank: 0,
                userId: p.user_id,
                username: p.user?.username || "Unknown",
                value: avg,
                isCurrentUser: p.user_id === userId
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
            programName: profile.program?.name,
            boardName: profile.program?.board?.name,
            institutionName: profile.institution?.name,
            hasInstitution: !!profile.institution_id
        }
    };
}
