import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = parseInt(session.user.id);

        const { battleId, targetUserId } = await request.json();

        if (!battleId || !targetUserId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { participants: true }
        });

        if (!battle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        // Verify Host
        if (battle.created_by !== userId) {
            return NextResponse.json({ error: "Only the host can kick players" }, { status: 403 });
        }

        // Verify Target is in battle
        const target = battle.participants.find(p => p.user_id === Number(targetUserId));
        if (!target) {
            return NextResponse.json({ error: "User not in battle" }, { status: 404 });
        }

        // Remove participant
        await prisma.battleParticipant.delete({
            where: { id: target.id }
        });

        // Broadcast KICK event
        const channel = supabaseAdmin!.channel(`battle:${battleId}`);
        await channel.send({
            type: 'broadcast',
            event: 'BATTLE_UPDATE',
            payload: {
                type: 'PLAYER_KICKED',
                userId: targetUserId
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[BATTLE-KICK] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to kick player" },
            { status: 500 }
        );
    }
}
