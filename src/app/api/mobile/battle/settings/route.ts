import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { quizService } from "@/lib/quiz-service";
import { BattleService } from "@/lib/battle-service"; // Reuse broadcast helper? No, it's private.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { battleId, subjectId, chapterId, questionCount, durationMinutes } = body;

        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { quiz: true }
        });

        if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        if (battle.created_by !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        // Logic to regenerate quiz if params changed
        let newQuizId = battle.quiz_id;
        const currentQuiz = battle.quiz;

        const needsRegeneration =
            (subjectId !== undefined && subjectId !== currentQuiz.subject_id) ||
            (chapterId !== undefined && BigInt(chapterId || 0) !== (currentQuiz.chapter_id || BigInt(0))) ||
            (questionCount !== undefined);

        // Note: questionCount checking is loose here, we always regenerate if count passed for safety

        if (needsRegeneration) {
            const targetSubject = subjectId !== undefined ? subjectId : currentQuiz.subject_id;
            const targetChapter = chapterId !== undefined ? chapterId : (currentQuiz.chapter_id ? Number(currentQuiz.chapter_id) : null);
            const targetCount = questionCount || 5;

            const newQuiz = await quizService.generateQuiz(
                userId,
                targetSubject,
                targetChapter,
                "medium",
                targetCount,
                ["MCQ", "TRUE_FALSE"]
            );
            newQuizId = newQuiz.id;
        }

        const updatedBattle = await prisma.battle.update({
            where: { id: battleId },
            data: {
                duration_minutes: durationMinutes !== undefined ? durationMinutes : battle.duration_minutes,
                quiz_id: newQuizId
            },
            include: {
                quiz: {
                    include: { subject: true, chapter: true }
                }
            }
        });

        // Serialize BigInts before sending (Supabase and Client)
        const serializedBattle = JSON.parse(JSON.stringify(updatedBattle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        // Broadcast
        await supabase.channel(`battle:${battleId}`).send({
            type: 'broadcast',
            event: 'BATTLE_UPDATE',
            payload: {
                type: 'SETTINGS_UPDATE',
                battle: serializedBattle
            }
        });

        return NextResponse.json({ success: true, battle: serializedBattle });

    } catch (error: any) {
        console.error("[MOBILE BATTLE SETTINGS] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update settings" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
