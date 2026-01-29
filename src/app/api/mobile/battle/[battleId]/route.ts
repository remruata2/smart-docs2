import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ battleId: string }> }) {
    try {
        const user = await getMobileUser(request);
        const { battleId } = await params;

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
        });

        if (!battle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        // Serialize BigInts
        const serializedBattle = JSON.parse(JSON.stringify(battle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, battle: serializedBattle });

    } catch (error: any) {
        console.error("[MOBILE BATTLE GET] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch battle" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
