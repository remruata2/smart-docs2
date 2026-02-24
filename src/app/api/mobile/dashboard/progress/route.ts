import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { calculateUserMastery } from "@/lib/mastery-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        // Run mastery calculation + recent activity in parallel
        const [masteryResult, recentActivity, badges, pointsAggregation] = await Promise.all([
            calculateUserMastery(userId),
            prisma.quiz.findMany({
                where: { user_id: userId, status: "COMPLETED" },
                take: 5,
                orderBy: { completed_at: 'desc' },
                include: {
                    chapter: { select: { title: true } },
                    subject: { select: { name: true } }
                }
            }),
            prisma.userBadge.findMany({
                where: { user_id: userId },
                include: { badge: true },
                orderBy: { earned_at: 'desc' }
            }),
            prisma.userPoints.aggregate({
                where: { user_id: userId },
                _sum: { points: true }
            }),
        ]);

        // Format recent activity
        const formattedActivity = recentActivity.map(q => ({
            id: q.id,
            chapterTitle: q.chapter?.title || "General Practice",
            subjectName: q.subject?.name || "Unknown",
            score: q.score,
            totalPoints: q.total_points,
            percentage: q.total_points > 0 ? Math.round((q.score / q.total_points) * 100) : 0,
            completedAt: q.completed_at
        }));

        // Available courses for filter
        const availableCourses = masteryResult.courseMasteryData.map(c => ({
            id: parseInt(c.courseId),
            title: c.courseTitle,
        }));

        return NextResponse.json({
            metrics: {
                ...masteryResult.metrics,
                totalPoints: pointsAggregation._sum.points || 0,
            },
            courseMasteryData: masteryResult.courseMasteryData,
            weaknessList: masteryResult.weaknessList,
            recentActivity: formattedActivity,
            badges: badges.map(ub => ({
                id: ub.id,
                name: ub.badge.name,
                icon: ub.badge.icon,
                earnedAt: ub.earned_at
            })),
            availableCourses,
        });

    } catch (error: any) {
        console.error("[MOBILE-PROGRESS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch progress data" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
