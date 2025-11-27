import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { z } from "zod";

const createBattleSchema = z.object({
    quizId: z.string(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { quizId } = createBattleSchema.parse(body);

        const battle = await BattleService.createBattle(parseInt(session.user.id), quizId);

        return NextResponse.json({ success: true, battle });
    } catch (error) {
        console.error("[BATTLE CREATE] Error:", error);
        return NextResponse.json(
            { error: "Failed to create battle" },
            { status: 500 }
        );
    }
}
