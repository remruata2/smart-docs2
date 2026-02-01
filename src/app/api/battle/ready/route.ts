import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const readySchema = z.object({
    battleId: z.string(),
    isReady: z.boolean(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { battleId, isReady } = readySchema.parse(body);

        // Update participant status via Service (handles broadcast)
        const updated = await BattleService.setReady(battleId, parseInt(session.user.id), isReady);

        return NextResponse.json({ success: true, isReady: updated.is_ready });
    } catch (error) {
        console.error("[BATTLE READY] Error:", error);
        return NextResponse.json(
            { error: "Failed to update ready status" },
            { status: 500 }
        );
    }
}
