import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-LEADERBOARD] Incoming request: ${request.url}`);

    try {
        await getMobileUser(request); // Just to verify auth

        // Get top users by score
        const topScores = await prisma.quiz.groupBy({
            by: ['user_id'],
            _sum: {
                score: true
            },
            orderBy: {
                _sum: {
                    score: 'desc'
                }
            },
            take: 10
        });

        // Fetch user names for these IDs
        const userIds = topScores.map((s: any) => s.user_id);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, email: true, image: true }
        });

        const leaderboard = topScores.map((score: any, index: number) => {
            const user = users.find(u => u.id === score.user_id);
            return {
                id: score.user_id.toString(),
                rank: index + 1,
                name: user?.username || user?.email?.split('@')[0] || 'User',
                points: score._sum.score || 0,
                avatar: user?.image || null,
            };
        });

        return NextResponse.json({ leaderboard });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-LEADERBOARD] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch leaderboard" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
