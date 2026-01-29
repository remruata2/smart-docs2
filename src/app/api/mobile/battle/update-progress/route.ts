import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { BattleService } from "@/lib/battle-service";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { battleId, score, questionIndex, finished } = body;

        const participant = await BattleService.updateProgress(
            battleId,
            userId,
            score,
            questionIndex,
            finished
        );

        return NextResponse.json({ success: true, participant });
    } catch (error: any) {
        console.error("[MOBILE BATTLE PROGRESS] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update progress" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
