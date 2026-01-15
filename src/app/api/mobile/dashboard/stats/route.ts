import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-STATS] Incoming request: ${request.url}`);

    try {
        const user = await getMobileUser(request);
        console.log(`[DEBUG-MOBILE-STATS] Authenticated user: ${user.email} (ID: ${user.id})`);

        // Get basic stats
        const quizzesCount = await prisma.quiz.count({
            where: {
                user_id: Number(user.id),
                status: 'COMPLETED'
            }
        });

        const totalPoints = await prisma.quiz.aggregate({
            where: { user_id: Number(user.id) },
            _sum: { score: true }
        });

        // Mock additional stats for now
        const stats = {
            total_points: totalPoints._sum.score || 0,
            quizzes_completed: quizzesCount,
            chapters_read: 5, // Mock
            current_streak: 3, // Mock
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
