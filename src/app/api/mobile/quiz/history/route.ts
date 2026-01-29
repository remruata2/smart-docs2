import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const quizzes = await prisma.quiz.findMany({
            where: {
                user_id: userId
            },
            select: {
                id: true,
                title: true,
                score: true,
                total_points: true,
                status: true,
                completed_at: true,
                created_at: true
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 50 // Limit to last 50 quizzes
        });

        // Map to ensure date format consistency if needed, though JSON handles Date objects
        const fullQuizzes = quizzes.map(q => ({
            ...q,
            completed_at: q.completed_at || q.created_at // Fallback for display if needed
        }));

        return NextResponse.json(fullQuizzes);
    } catch (error: any) {
        console.error("[MOBILE-QUIZ-HISTORY] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch quiz history" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
