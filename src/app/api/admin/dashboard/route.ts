import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { subDays, startOfDay, format } from "date-fns";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const thirtyDaysAgo = subDays(now, 30);

        // Parallel queries for KPI counts
        const [
            totalUsers,
            newUsers7d,
            activeSubscriptions,
            totalEnrollments,
            quizzesCompleted,
            battlesPlayed,
            aiConversations,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { created_at: { gte: sevenDaysAgo } } }),
            prisma.userSubscription.count({ where: { status: "active" } }),
            prisma.userEnrollment.count(),
            prisma.quiz.count({ where: { status: "COMPLETED" } }),
            prisma.battle.count({ where: { status: "COMPLETED" } }),
            prisma.conversation.count(),
        ]);

        // Calculate 30-day revenue (estimated)
        // We'll sum up the monthly price of active subscriptions
        const activeSubsWithPlans = await prisma.userSubscription.findMany({
            where: { status: "active" },
            include: { plan: true },
        });

        const monthlyRevenue = activeSubsWithPlans.reduce((sum, sub) => {
            const price = sub.billing_cycle === "yearly"
                ? (Number(sub.plan.price_yearly || 0) / 12)
                : Number(sub.plan.price_monthly);
            return sum + price;
        }, 0);

        // Time-series data (Last 30 days)
        // 1. User Growth
        const userGrowthRaw = await prisma.$queryRaw<any[]>`
			SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
			FROM "user"
			WHERE created_at >= ${thirtyDaysAgo}
			GROUP BY date
			ORDER BY date ASC
		`;

        // 2. Revenue Trend (based on subscription creation)
        const revenueTrendRaw = await prisma.$queryRaw<any[]>`
			SELECT DATE_TRUNC('day', us.created_at) as date, SUM(
				CASE 
					WHEN us.billing_cycle = 'yearly' THEN sp.price_yearly
					ELSE sp.price_monthly
				END
			) as amount
			FROM "user_subscriptions" us
			JOIN "subscription_plans" sp ON us.plan_id = sp.id
			WHERE us.created_at >= ${thirtyDaysAgo}
			GROUP BY date
			ORDER BY date ASC
		`;

        // 3. Enrollment Trend
        const enrollmentTrendRaw = await prisma.$queryRaw<any[]>`
			SELECT DATE_TRUNC('day', enrolled_at) as date, COUNT(*) as count
			FROM "user_enrollments"
			WHERE enrolled_at >= ${thirtyDaysAgo}
			GROUP BY date
			ORDER BY date ASC
		`;

        // 4. Activity (Quizzes & Battles)
        const quizActivityRaw = await prisma.$queryRaw<any[]>`
			SELECT DATE_TRUNC('day', completed_at) as date, COUNT(*) as count
			FROM "quizzes"
			WHERE completed_at >= ${thirtyDaysAgo} AND status = 'COMPLETED'
			GROUP BY date
			ORDER BY date ASC
		`;

        const battleActivityRaw = await prisma.$queryRaw<any[]>`
			SELECT DATE_TRUNC('day', ended_at) as date, COUNT(*) as count
			FROM "battles"
			WHERE ended_at >= ${thirtyDaysAgo} AND status = 'COMPLETED'
			GROUP BY date
			ORDER BY date ASC
		`;

        // Helper to fill missing dates with zero
        const fillMissingDates = (rawData: any[], fieldName: string) => {
            const dataMap = new Map();
            rawData.forEach(item => {
                const dateStr = format(new Date(item.date), 'yyyy-MM-dd');
                dataMap.set(dateStr, Number(item[fieldName] || item.count || 0));
            });

            const result = [];
            for (let i = 29; i >= 0; i--) {
                const date = subDays(now, i);
                const dateStr = format(date, 'yyyy-MM-dd');
                result.push({
                    date: dateStr,
                    [fieldName]: dataMap.get(dateStr) || 0
                });
            }
            return result;
        };

        const userGrowth = fillMissingDates(userGrowthRaw, 'count');
        const revenueTrend = fillMissingDates(revenueTrendRaw, 'amount');
        const enrollmentTrend = fillMissingDates(enrollmentTrendRaw, 'count');

        // Combined activity chart
        const quizMap = new Map();
        quizActivityRaw.forEach(item => quizMap.set(format(new Date(item.date), 'yyyy-MM-dd'), Number(item.count)));

        const battleMap = new Map();
        battleActivityRaw.forEach(item => battleMap.set(format(new Date(item.date), 'yyyy-MM-dd'), Number(item.count)));

        const activityTrend = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(now, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            activityTrend.push({
                date: dateStr,
                quizzes: quizMap.get(dateStr) || 0,
                battles: battleMap.get(dateStr) || 0
            });
        }

        // Recent items
        const [recentUsers, recentEnrollments] = await Promise.all([
            prisma.user.findMany({
                take: 10,
                orderBy: { created_at: "desc" },
                select: { id: true, username: true, email: true, role: true, created_at: true }
            }),
            prisma.userEnrollment.findMany({
                take: 10,
                orderBy: { enrolled_at: "desc" },
                include: {
                    user: { select: { username: true, name: true } },
                    course: { select: { title: true } }
                }
            })
        ]);

        return NextResponse.json({
            kpis: {
                totalUsers,
                newUsers7d,
                activeSubscriptions,
                totalEnrollments,
                quizzesCompleted,
                battlesPlayed,
                aiConversations,
                revenue30d: monthlyRevenue
            },
            charts: {
                userGrowth,
                revenueTrend,
                enrollmentTrend,
                activityTrend
            },
            recent: {
                users: recentUsers,
                enrollments: recentEnrollments
            }
        });

    } catch (error) {
        console.error("Admin dashboard API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
