import { BattleArena } from "@/components/battle/BattleArena";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect, notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ battleId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function BattleRoomPage({ params }: PageProps) {
    const { battleId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id);

    // Parallelize data fetching
    const [courseIdData, battleData] = await Promise.all([
        prisma.userEnrollment.findFirst({
            where: { user_id: userId, status: 'active' },
            select: { course_id: true }
        }),
        prisma.battle.findUnique({
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
                        questions: true,
                        chapter: {
                            include: {
                                subject: {
                                    select: { name: true }
                                }
                            }
                        }
                    }
                }
            }
        })
    ]);

    if (!battleData) {
        notFound();
    }

    // Ensure user is participant
    const isParticipant = battleData.participants.some(p => p.user_id === userId);
    if (!isParticipant) {
        console.warn(`[BATTLE-ROOM] User ${userId} is not a participant in battle ${battleId}. Redirecting...`);
        redirect("/app/practice/battle");
    }

    const courseId = courseIdData?.course_id?.toString() || "general";

    // Serialize BigInts before passing to Client Component
    const serializedBattle = JSON.parse(JSON.stringify(battleData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

    return (
        <BattleArena
            battle={serializedBattle}
            currentUser={{
                id: userId,
                username: session.user.name || session.user.email,
            }}
            courseId={courseId}
        />
    );
}
