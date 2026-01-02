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
    scope: LeaderboardScope | "COURSE",
    metric: LeaderboardMetric,
    courseId?: number
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

    if (!profile) {
        return null;
    }

    const programId = profile.program_id;
    const boardId = profile.program?.board_id;
    const institutionId = profile.institution_id;

    // 2. Define Filter Conditions
    let targetUserIds: number[] = [];

    if (scope === "COURSE" && courseId) {
        // Fetch all users enrolled in this course
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                course_id: courseId,
                status: "active"
            },
            select: { user_id: true }
        });
        targetUserIds = enrollments.map(e => e.user_id);
    } else if (scope === "INSTITUTION") {
        if (!institutionId) {
            return null;
        }
        // Fetch all users in this institution
        const profiles = await prisma.profile.findMany({
            where: { institution_id: institutionId },
            select: { user_id: true }
        });
        targetUserIds = profiles.map(p => p.user_id);
    } else {
        // BOARD level - scoped by program for now
        if (!programId) return null;
        const profiles = await prisma.profile.findMany({
            where: { program_id: programId },
            select: { user_id: true }
        });
        targetUserIds = profiles.map(p => p.user_id);
    }

    let entries: LeaderboardEntry[] = [];

    // 3. Aggregate Data based on Metric
    if (metric === "POINTS") {
        // Aggregate UserPoints
        // We need to join UserPoints with Profile to filter by Program
        // Prisma doesn't support direct joins in groupBy easily with relations filters on the grouped table
        // So we fetch profiles first, then their points, or use raw query for performance.
        // For now, let's use Prisma's relation queries.

        // Fetch all profiles in this scope for usernames
        const profiles = await prisma.profile.findMany({
            where: { user_id: { in: targetUserIds } },
            select: {
                user_id: true,
                user: {
                    select: {
                        username: true,
                    }
                },
            },
        });

        const pointsAgg = await prisma.userPoints.groupBy({
            by: ['user_id'],
            where: {
                user_id: { in: targetUserIds }
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
            where: { user_id: { in: targetUserIds } },
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
