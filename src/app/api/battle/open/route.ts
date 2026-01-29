import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BattleStatus } from "@/generated/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const battles = await prisma.battle.findMany({
            where: {
                status: BattleStatus.WAITING,
                is_public: true,
                created_at: {
                    // Ensure battle isn't stale (e.g. older than 1 hour)
                    gte: new Date(Date.now() - 1 * 60 * 60 * 1000)
                }
            },
            include: {
                _count: {
                    select: { participants: true }
                },
                creator: {
                    select: { username: true, image: true }
                },
                quiz: {
                    select: {
                        title: true,
                        chapter: {
                            select: {
                                title: true,
                                subject: {
                                    select: { name: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 20
        });

        // Filter out full battles (assumed limit 8)
        const openBattles = battles.filter(b => (b as any)._count.participants < 8);

        // Serialize BigInts before returning
        const serializedBattles = JSON.parse(JSON.stringify(openBattles, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ battles: serializedBattles });
    } catch (error: any) {
        console.error("[BATTLE-OPEN] Error:", error);
        return NextResponse.json({ error: "Failed to fetch battles" }, { status: 500 });
    }
}
