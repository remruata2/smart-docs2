import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { z } from "zod";

const startBattleSchema = z.object({
    battleId: z.string(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { battleId } = startBattleSchema.parse(body);

        const battle = await BattleService.startBattle(battleId, parseInt(session.user.id));

        return NextResponse.json({ success: true, battle });
    } catch (error: any) {
        console.error("[BATTLE START] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start battle" },
            { status: 500 }
        );
    }
}
