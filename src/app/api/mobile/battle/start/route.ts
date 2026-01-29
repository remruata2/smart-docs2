import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { BattleService } from "@/lib/battle-service";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { battleId } = body;

        const battle = await BattleService.startBattle(battleId, userId);

        // Serialize BigInts
        const serializedBattle = JSON.parse(JSON.stringify(battle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, battle: serializedBattle });
    } catch (error: any) {
        console.error("[MOBILE BATTLE START] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start battle" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
