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

    // 1. Get current enrollment context
    const currentEnrollment = await prisma.userEnrollment.findFirst({
        where: {
            user_id: userId,
            status: "active",
            ...(courseId ? { course_id: courseId } : {})
        },
        include: {
            program: { include: { board: true } },
            institution: true,
            course: true,
            user: {
                select: {
                    username: true,
                },
            },
        },
        orderBy: { last_accessed_at: "desc" }
    });

    if (!currentEnrollment) {
        return null;
    }

    const programId = currentEnrollment.program_id;
    const institutionId = currentEnrollment.institution_id;
    const activeCourseId = courseId || currentEnrollment.course_id;

    // 2. Define Filter Conditions
    let targetUserIds: number[] = [];

    if (scope === "COURSE") {
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                course_id: activeCourseId,
                status: "active"
            },
            select: { user_id: true }
        });
        targetUserIds = enrollments.map(e => e.user_id);
    } else if (scope === "INSTITUTION") {
        if (!institutionId) {
            return null;
        }
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                institution_id: institutionId,
                status: "active"
            },
            select: { user_id: true }
        });
        targetUserIds = Array.from(new Set(enrollments.map(e => e.user_id)));
    } else {
        // BOARD level - scoped by program context
        if (!programId) return null;
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                program_id: programId,
                status: "active"
            },
            select: { user_id: true }
        });
        targetUserIds = Array.from(new Set(enrollments.map(e => e.user_id)));
    }

    let entries: LeaderboardEntry[] = [];

    // 3. Aggregate Data based on Metric
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
        const pointsAgg = await prisma.userPoints.groupBy({
            by: ['user_id'],
            where: {
                user_id: { in: targetUserIds }
            },
            _sum: {
                points: true
            },
        });

        const pointsMap = new Map(pointsAgg.map(p => [p.user_id, p._sum.points || 0]));

        entries = users.map(u => ({
            rank: 0,
            userId: u.id,
            username: u.username || "Unknown",
            avatarUrl: u.image,
            value: pointsMap.get(u.id) || 0,
            isCurrentUser: u.id === userId
        }));

    } else if (metric === "AVG_SCORE") {
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
            programName: currentEnrollment.program?.name,
            boardName: currentEnrollment.program?.board?.name,
            institutionName: currentEnrollment.institution?.name,
            courseTitle: currentEnrollment.course?.title,
            hasInstitution: !!currentEnrollment.institution_id
        }
    };
}
