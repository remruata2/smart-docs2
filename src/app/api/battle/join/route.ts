import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkAIFeatureAccess } from "@/lib/trial-access";

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

        const battle = await BattleService.joinBattle(parseInt(session.user.id), code) as any;

        // Check trial access for joining user
        if (battle.quiz?.chapter_id) {
            const access = await checkAIFeatureAccess(parseInt(session.user.id), battle.quiz.chapter_id, prisma);
            if (!access.allowed) {
                // If access denied, we might need to "un-join" or just block the response
                // Since they can't join battles for locked chapters, blocking here is sufficient
                return NextResponse.json(
                    { error: access.reason || "Trial access restricted" },
                    { status: 403 }
                );
            }
        }


        const serializedBattle = JSON.parse(JSON.stringify(battle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, battle: serializedBattle });
    } catch (error: any) {
        console.error("[BATTLE JOIN] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to join battle" },
            { status: 500 }
        );
    }
}
