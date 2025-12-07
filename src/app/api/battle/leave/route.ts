import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { battleId } = await req.json();

        if (!battleId) {
            return NextResponse.json({ error: "Battle ID is required" }, { status: 400 });
        }

        // Fetch battle to check permissions
        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { participants: true }
        });

        if (!battle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        const userId = parseInt(session.user.id);
        const isHost = battle.created_by === userId;

        if (isHost) {
            // Host is leaving -> Cancel the battle
            await prisma.battle.delete({
                where: { id: battleId }
            });

            // Broadcast cancellation
            await supabase.channel(`battle:${battleId}`).send({
                type: 'broadcast',
                event: 'BATTLE_UPDATE',
                payload: { type: 'BATTLE_CANCELLED' }
            });

            return NextResponse.json({ message: "Battle cancelled" });
        } else {
            // Participant is leaving -> Remove participant
            const participant = battle.participants.find(p => p.user_id === userId);

            if (participant) {
                await prisma.battleParticipant.delete({
                    where: { id: participant.id }
                });

                // Broadcast participant left
                await supabase.channel(`battle:${battleId}`).send({
                    type: 'broadcast',
                    event: 'BATTLE_UPDATE',
                    payload: { type: 'PARTICIPANT_LEFT', userId: userId }
                });
            }

            return NextResponse.json({ message: "Left battle" });
        }

    } catch (error) {
        console.error("Error leaving battle:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
