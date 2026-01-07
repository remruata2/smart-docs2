import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkAIFeatureAccess } from "@/lib/trial-access";

const createBattleSchema = z.object({
    quizId: z.string(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { quizId } = createBattleSchema.parse(body);

        // Fetch the quiz to get the chapterId for access check
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { chapter_id: true }
        });

        if (quiz?.chapter_id) {
            const access = await checkAIFeatureAccess(parseInt(session.user.id), quiz.chapter_id, prisma);
            if (!access.allowed) {
                return NextResponse.json(
                    { error: access.reason || "Trial access restricted" },
                    { status: 403 }
                );
            }
        }

        const battle = await BattleService.createBattle(parseInt(session.user.id), quizId);

        return NextResponse.json({ success: true, battle });
    } catch (error) {
        console.error("[BATTLE CREATE] Error:", error);
        return NextResponse.json(
            { error: "Failed to create battle" },
            { status: 500 }
        );
    }
}
