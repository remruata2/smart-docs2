import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { quizService } from "@/lib/quiz-service";
import { QuestionType } from "@/generated/prisma";
import { SupabaseClient } from "@supabase/supabase-js";

const updateSettingsSchema = z.object({
    battleId: z.string(),
    subjectId: z.number().nullable().optional(),
    chapterId: z.number().nullable().optional(),
    questionCount: z.number().min(5).max(20).optional(),
    durationMinutes: z.number().min(1).max(60).optional(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { battleId, subjectId, chapterId, questionCount, durationMinutes } = updateSettingsSchema.parse(body);

        // Fetch battle to check host
        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { quiz: true }
        });

        if (!battle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        if (battle.created_by !== parseInt(session.user.id)) {
            return NextResponse.json({ error: "Only the host can change settings" }, { status: 403 });
        }

        if (battle.status !== "WAITING") {
            return NextResponse.json({ error: "Cannot change settings after battle started" }, { status: 400 });
        }

        let newQuizId = battle.quiz_id;
        const currentQuiz = battle.quiz;

        // Check if we need to regenerate quiz
        // Logic: if subject/chapter changed, OR if questionCount changed
        // Note: currentQuiz doesn't store 'desired' question count, but we can check actual length
        const needsRegeneration =
            (subjectId !== undefined && subjectId !== currentQuiz.subject_id) ||
            (chapterId !== undefined && BigInt(chapterId || 0) !== (currentQuiz.chapter_id || BigInt(0))) || // flexible comparison
            (questionCount !== undefined && questionCount !== (await prisma.quizQuestion.count({ where: { quiz_id: currentQuiz.id } })));

        if (needsRegeneration) {
            // Determine params for new quiz
            const targetSubjectId = subjectId !== undefined ? subjectId : currentQuiz.subject_id;
            const targetChapterId = chapterId !== undefined ? chapterId : (currentQuiz.chapter_id ? Number(currentQuiz.chapter_id) : null);
            const targetCount = questionCount !== undefined ? questionCount : (await prisma.quizQuestion.count({ where: { quiz_id: currentQuiz.id } }));

            // EXCLUSION: Prevent usage of custom subjects in Battle Mode
            if (targetSubjectId) {
                const checkedSubject = await prisma.subject.findUnique({
                    where: { id: targetSubjectId },
                    select: { created_by_user_id: true }
                });
                if (checkedSubject?.created_by_user_id) {
                    return NextResponse.json({ error: "Custom subjects are not allowed in Battle Mode" }, { status: 400 });
                }
            }

            // Use existing question types if possible (or default to MCQ for battles)
            // Ideally we'd parse types from existing questions, but sticking to MCQ/TrueFalse is safe for battles
            const questionTypes: QuestionType[] = ["MCQ", "TRUE_FALSE"];

            // Generate new quiz
            console.log(`[BATTLE-SETTINGS] Regenerating quiz for battle ${battleId}. Subject: ${targetSubjectId}, Chapter: ${targetChapterId}, Count: ${targetCount}`);

            // We use quizService directly.
            // Note: difficulty defaults to 'medium' if we don't track it. We assume 'medium' or existing difficulty?
            // Since we don't store difficulty on Quiz model explicitly (just description/title), we default to 'medium'.
            const newQuiz = await quizService.generateQuiz(
                parseInt(session.user.id),
                targetSubjectId,
                targetChapterId,
                "medium",
                targetCount,
                questionTypes
            );
            newQuizId = newQuiz.id;
        }

        // Update Battle
        const updatedBattle = await prisma.battle.update({
            where: { id: battleId },
            data: {
                duration_minutes: durationMinutes !== undefined ? durationMinutes : battle.duration_minutes,
                quiz_id: newQuizId
            },
            include: {
                quiz: {
                    include: {
                        subject: true,
                        chapter: true
                    }
                }
            }
        });

        // Broadcast update via Supabase (if configured)
        // We construct the payload manually to avoid circular deps or complex service calls
        // Just notify 'BATTLE_CONFIG_UPDATED' or generic 'BATTLE_UPDATE'
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // Serialize BigInts before sending (Supabase and Client)
        const serializedBattle = JSON.parse(JSON.stringify(updatedBattle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        if (supabaseUrl && supabaseKey) {
            const supabase = new SupabaseClient(supabaseUrl, supabaseKey);
            await supabase.channel(`battle:${battleId}`).send({
                type: 'broadcast',
                event: 'BATTLE_UPDATE',
                payload: {
                    type: 'SETTINGS_UPDATE',
                    battle: serializedBattle
                }
            });
        }

        return NextResponse.json({ success: true, battle: serializedBattle });

    } catch (error: any) {
        console.error("[BATTLE SETTINGS] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update settings" },
            { status: 500 }
        );
    }
}
