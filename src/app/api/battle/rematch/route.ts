import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { generateQuizAction } from "@/app/app/practice/actions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { battleId } = await req.json();

        if (!battleId) {
            return NextResponse.json({ error: "Battle ID required" }, { status: 400 });
        }

        // Get original battle to fetch quiz settings
        const originalBattle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: {
                quiz: {
                    select: {
                        subject_id: true,
                        chapter_id: true,
                        questions: {
                            take: 1,
                            select: { question_type: true }
                        }
                    }
                },
                participants: true
            }
        });

        if (!originalBattle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        // Verify user is a participant
        const isParticipant = originalBattle.participants.some(p => p.user_id === userId);
        if (!isParticipant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Generate new quiz with same settings
        const newQuiz = await generateQuizAction(
            originalBattle.quiz.subject_id,
            originalBattle.quiz.chapter_id ? Number(originalBattle.quiz.chapter_id) : null,
            "medium",
            5,
            ["MCQ"]
        );

        // Create rematch battle
        const newBattle = await BattleService.rematchBattle(battleId, newQuiz.id, userId);

        // Serialize BigInt fields
        const sanitizedBattle = {
            ...newBattle,
            quiz: {
                ...newBattle.quiz,
                chapter_id: newBattle.quiz.chapter_id?.toString() || null,
                questions: newBattle.quiz.questions.map((q: any) => ({
                    ...q,
                    quiz_id: q.quiz_id?.toString() || null
                }))
            }
        };

        return NextResponse.json({
            success: true,
            battleId: newBattle.id,
            battle: sanitizedBattle
        });

    } catch (error: any) {
        console.error("[BATTLE REMATCH] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create rematch" },
            { status: 500 }
        );
    }
}
