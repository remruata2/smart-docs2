import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-LEADERBOARD] Incoming request: ${request.url}`);

    try {
        const user = await getMobileUser(request);
        const userId = user.id;

        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'weekly';
        const courseIdParam = searchParams.get('courseId');

        // 1. Determine active course and subjects
        const currentEnrollment = await prisma.userEnrollment.findFirst({
            where: {
                user_id: userId,
                status: "active",
                ...(courseIdParam ? { course_id: parseInt(courseIdParam) } : {})
            },
            include: {
                course: {
                    include: {
                        subjects: true
                    }
                }
            },
            orderBy: { last_accessed_at: "desc" }
        });

        if (!currentEnrollment || !currentEnrollment.course) {
            return NextResponse.json({ leaderboard: [], userRank: null, message: "No active course enrollment found" });
        }

        const activeCourseId = currentEnrollment.course_id;
        const courseSubjectIds = currentEnrollment.course.subjects.map(s => s.id);

        // 2. Define Date Filter for Timeframe
        let dateFilter = {};
        const now = new Date();
        // Reset time to midnight for consistent filtering
        const todayMidnight = new Date(now.setHours(0, 0, 0, 0));

        if (timeframe === 'weekly') {
            const day = todayMidnight.getDay() || 7; // Get current day number, make Sunday 7
            if (day !== 1) todayMidnight.setHours(-24 * (day - 1)); // Set to previous Monday
            dateFilter = { created_at: { gte: todayMidnight } };
        } else if (timeframe === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { created_at: { gte: startOfMonth } };
        }
        // 'all_time' (or unknown) -> no date filter

        // 3. Define Target Users (Enrolled in Course)
        // We only rank users in the same course
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                course_id: activeCourseId,
                status: "active"
            },
            select: { user_id: true }
        });
        const targetUserIds = enrollments.map(e => e.user_id);

        // 4. Aggregate Battle Points
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

        // 5. Fetch User Details
        // Only fetch for users who have points to save DB calls, or fetch all target users?
        // Let's fetch top users from aggregation.
        // But we need to know the current user's rank even if 0 points.
        // Filter out 0 points? Leaderboards usually show top scorers.

        const pointsMap = new Map(battlePointsAgg.map(p => [p.user_id, p._sum?.points_change || 0]));

        // If current user has 0 points, ensure they are in the list for ranking purposes?
        // Or just map all target users if list isn't too huge?
        // For mobile, we might just want top 50 + current user.

        // Filter out users who have no points record or exactly 0 points
        const usersWithPoints = battlePointsAgg
            .filter(p => (p._sum.points_change || 0) !== 0)
            .map(p => p.user_id);

        // Add current user if they have points ?
        // If current user has 0 points, they won't be in the list as per request.
        // We will just fetch details for valid users.

        // Fetch details
        const users = await prisma.user.findMany({
            where: { id: { in: usersWithPoints } },
            select: { id: true, username: true, image: true }
        });

        const leaderboard = users.map(u => ({
            userId: u.id,
            username: u.username || 'User',
            points: pointsMap.get(u.id) || 0,
            avatar: u.image,
            isCurrentUser: u.id === userId,
        }));

        // Sort
        leaderboard.sort((a, b) => b.points - a.points);

        // Assign Rank
        const rankedLeaderboard = leaderboard.map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));

        // Limit response size but keeping current user
        // Slice top 50
        const top50 = rankedLeaderboard.slice(0, 50);

        // If current user not in top 50, add them?
        // The mobile app handles pagination? No, it just shows list.
        // We can return the full list or top X. 
        // Previously returned top 10. Let's return top 50.

        return NextResponse.json({
            leaderboard: top50,
            userRank: rankedLeaderboard.find(e => e.isCurrentUser)?.rank || null,
            courseTitle: currentEnrollment.course.title
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-LEADERBOARD] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch leaderboard" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
