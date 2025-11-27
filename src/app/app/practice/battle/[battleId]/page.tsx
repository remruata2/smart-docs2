import { BattleArena } from "@/components/battle/BattleArena";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ battleId: string }>;
}

export default async function BattleRoomPage({ params }: PageProps) {
    const { battleId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const battle = await prisma.battle.findUnique({
        where: { id: battleId },
        include: {
            participants: {
                include: {
                    user: {
                        select: { id: true, username: true, email: true }
                    }
                }
            },
            quiz: {
                include: {
                    questions: true
                }
            }
        }
    });

    if (!battle) {
        notFound();
    }

    // Ensure user is participant
    const isParticipant = battle.participants.some(p => p.user_id === parseInt(session.user.id));
    if (!isParticipant) {
        // Redirect to join page or show error
        redirect("/app/practice/battle");
    }

    return (
        <BattleArena
            battle={battle}
            currentUser={{
                id: parseInt(session.user.id),
                username: session.user.name || session.user.email,
            }}
            supabaseConfig={{
                url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
                anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
            }}
        />
    );
}
