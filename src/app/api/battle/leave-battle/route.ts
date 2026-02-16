import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log("[API] Loaded battle/leave route");


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
            // Host is leaving
            // If battle is WAITING, cancel it (delete)
            // If IN_PROGRESS or COMPLETED, just mark host as left or do nothing (allow rejoin on refresh)
            if (battle.status === 'WAITING') {
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
                // If battle is in progress, do NOT delete.
                return NextResponse.json({ message: "Host left (Battle continues)" });
            }
        } else {
            // Participant is leaving
            const participant = battle.participants.find(p => p.user_id === userId);

            if (participant) {
                if (battle.status === 'IN_PROGRESS') {
                    // Mid-game leave: Mark as finished (forfeit) instead of deleting
                    // This allows the battle to complete normally for other players
                    await prisma.battleParticipant.update({
                        where: { id: participant.id },
                        data: {
                            finished: true,
                            completed_at: new Date(),
                        }
                    });

                    // Broadcast that this player finished (forfeited)
                    await supabase.channel(`battle:${battleId}`).send({
                        type: 'broadcast',
                        event: 'BATTLE_UPDATE',
                        payload: { type: 'PLAYER_FINISHED', userId: userId, score: participant.score || 0 }
                    });
                } else {
                    // Lobby leave: Remove participant entirely
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
            }

            return NextResponse.json({ message: "Left battle" });
        }

    } catch (error) {
        console.error("Error leaving battle:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
