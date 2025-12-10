import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { z } from "zod";

const joinBattleSchema = z.object({
    code: z.string().length(6),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { code } = joinBattleSchema.parse(body);
        console.log(`[BATTLE JOIN] Attempting to join battle with code: "${code}" for user: ${session.user.id}`);

        const battle = await BattleService.joinBattle(parseInt(session.user.id), code);

        return NextResponse.json({ success: true, battle });
    } catch (error: any) {
        console.error("[BATTLE JOIN] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to join battle" },
            { status: 500 }
        );
    }
}
