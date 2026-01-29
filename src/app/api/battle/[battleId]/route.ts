import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ battleId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        // Hide answers from client
        const sanitizedBattle = {
            ...battle,
            quiz: {
                ...battle.quiz,
                chapter_id: battle.quiz.chapter_id?.toString() || null,
                questions: battle.quiz.questions.map(q => ({
                    ...q,
                    // We need correct_answer for client-side validation in Battle Arena
                    // correct_answer: null, 
                    explanation: null
                }))
            }
        };


        const serializedBattle = JSON.parse(JSON.stringify(sanitizedBattle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ battle: serializedBattle });
    } catch (error) {
        console.error("Error fetching battle:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
