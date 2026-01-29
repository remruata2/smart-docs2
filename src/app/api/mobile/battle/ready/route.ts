import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { battleId, isReady } = body;

        const participant = await prisma.battleParticipant.findUnique({
            where: {
                battle_id_user_id: {
                    battle_id: battleId,
                    user_id: userId
                }
            }
        });

        if (!participant) {
            return NextResponse.json({ error: "Participant not found" }, { status: 404 });
        }

        const updated = await prisma.battleParticipant.update({
            where: { id: participant.id },
            data: { is_ready: isReady }
        });

        // Broadcast
        await supabase.channel(`battle:${battleId}`).send({
            type: 'broadcast',
            event: 'BATTLE_UPDATE',
            payload: { type: 'READY_UPDATE', userId, isReady }
        });

        return NextResponse.json({ success: true, participant: updated });

    } catch (error: any) {
        console.error("[MOBILE BATTLE READY] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to toggle ready" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
