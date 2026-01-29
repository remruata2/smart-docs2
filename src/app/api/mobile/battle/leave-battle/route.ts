import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin for backend operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { battleId } = body;

        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { participants: true }
        });

        if (!battle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        const isHost = battle.created_by === userId;

        if (isHost) {
            // Host leaving -> Cancel Battle
            // Using Promise.all for speed
            await Promise.all([
                prisma.battle.delete({ where: { id: battleId } }),
                supabase.channel(`battle:${battleId}`).send({
                    type: 'broadcast',
                    event: 'BATTLE_UPDATE',
                    payload: { type: 'BATTLE_CANCELLED' }
                })
            ]);
            return NextResponse.json({ message: "Battle cancelled" });
        } else {
            // Participant leaving
            const participant = battle.participants.find(p => p.user_id === userId);
            if (participant) {
                await Promise.all([
                    prisma.battleParticipant.delete({ where: { id: participant.id } }),
                    supabase.channel(`battle:${battleId}`).send({
                        type: 'broadcast',
                        event: 'BATTLE_UPDATE',
                        payload: { type: 'PARTICIPANT_LEFT', userId }
                    })
                ]);
            }
            return NextResponse.json({ message: "Left battle" });
        }

    } catch (error: any) {
        console.error("[MOBILE BATTLE LEAVE] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to leave battle" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
