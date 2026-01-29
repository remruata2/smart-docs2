import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { z } from "zod";

const updateProgressSchema = z.object({
    battleId: z.string(),
    score: z.number(),
    questionIndex: z.number(),
    finished: z.boolean().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { battleId, score, questionIndex, finished } = updateProgressSchema.parse(body);

        const participant = await BattleService.updateProgress(
            battleId,
            parseInt(session.user.id),
            score,
            questionIndex,
            finished
        );


        const serializedParticipant = JSON.parse(JSON.stringify(participant, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, participant: serializedParticipant });
    } catch (error) {
        console.error("[BATTLE PROGRESS] Error:", error);
        return NextResponse.json(
            { error: "Failed to update progress" },
            { status: 500 }
        );
    }
}
