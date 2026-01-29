import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { BattleService } from "@/lib/battle-service";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: "Battle code is required" }, { status: 400 });
        }

        const battle = await BattleService.joinBattle(userId, code);

        // Serialize BigInts
        const serializedBattle = JSON.parse(JSON.stringify(battle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, battle: serializedBattle });
    } catch (error: any) {
        console.error("[MOBILE BATTLE JOIN] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to join battle" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
