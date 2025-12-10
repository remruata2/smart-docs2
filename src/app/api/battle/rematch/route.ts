import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { BattleService } from "@/lib/battle-service";
import { generateQuizAction } from "@/app/app/practice/actions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { battleId } = await req.json();

        if (!battleId) {
            return NextResponse.json({ error: "Battle ID required" }, { status: 400 });
        }

        // Get original battle to fetch quiz settings
        const originalBattle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: {
                quiz: {
                    select: {
                        subject_id: true,
                        chapter_id: true,
                        questions: {
                            take: 1,
                            select: { question_type: true }
                        }
                    }
                },
                participants: true
            }
        });

        if (!originalBattle) {
            return NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }

        // Verify user is a participant
        const isParticipant = originalBattle.participants.some(p => p.user_id === userId);
        if (!isParticipant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Get opponent's user ID
        const opponent = originalBattle.participants.find(p => p.user_id !== userId);
        if (!opponent) {
            return NextResponse.json({ error: "Opponent not found" }, { status: 404 });
        }

        // CHECK: Has the opponent already created a rematch?
        // Look for recent battles (created in last 5 minutes) where:
        // 1. Created by the opponent
        // 2. Status is WAITING
        // 3. Has only 1 participant (the opponent)
        // 4. Uses the same quiz settings
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const existingRematch = await prisma.battle.findFirst({
            where: {
                created_by: opponent.user_id,
                status: "WAITING",
                created_at: {
                    gte: fiveMinutesAgo
                },
                quiz: {
                    subject_id: originalBattle.quiz.subject_id,
                    chapter_id: originalBattle.quiz.chapter_id
                },
                participants: {
                    every: {
                        user_id: opponent.user_id
                    }
                }
            },
            include: {
                quiz: {
                    include: {
                        questions: true
                    }
                },
                participants: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // If opponent already created a rematch, JOIN it automatically
        if (existingRematch && existingRematch.participants.length === 1) {
            console.log(`[REMATCH] Auto-joining opponent's battle: ${existingRematch.id}`);

            // Join the existing battle
            await BattleService.joinBattle(userId, existingRematch.code);

            // Fetch the complete battle data with quiz included
            const joinedBattle = await prisma.battle.findUnique({
                where: { id: existingRematch.id },
                include: {
                    participants: {
                        include: {
                            user: true
                        }
                    },
                    quiz: {
                        include: {
                            questions: true
                        }
                    }
                }
            });

            if (!joinedBattle) {
                return NextResponse.json({ error: "Failed to fetch joined battle" }, { status: 500 });
            }

            // Serialize BigInt fields
            const sanitizedBattle = {
                ...joinedBattle,
                quiz: {
                    ...joinedBattle.quiz,
                    chapter_id: joinedBattle.quiz.chapter_id?.toString() || null,
                    questions: joinedBattle.quiz.questions.map((q: any) => ({
                        ...q,
                        quiz_id: q.quiz_id?.toString() || null
                    }))
                }
            };

            return NextResponse.json({
                success: true,
                battleId: joinedBattle.id,
                battle: sanitizedBattle,
                autoJoined: true  // Flag to indicate this was an auto-join
            });
        }

        // Otherwise, create a new rematch battle as usual
        console.log(`[REMATCH] Creating new battle for user ${userId}`);

        // Generate new quiz with same settings (now using strict bank mode for battles)
        const newQuiz = await generateQuizAction(
            originalBattle.quiz.subject_id,
            originalBattle.quiz.chapter_id ? Number(originalBattle.quiz.chapter_id) : null,
            "medium",
            5,
            ["MCQ"],
            false  // Disable AI fallback - use only stored questions for battles
        );

        // Create rematch battle
        const newBattle = await BattleService.rematchBattle(battleId, newQuiz.id, userId);

        // Serialize BigInt fields
        const sanitizedBattle = {
            ...newBattle,
            quiz: {
                ...newBattle.quiz,
                chapter_id: newBattle.quiz.chapter_id?.toString() || null,
                questions: newBattle.quiz.questions.map((q: any) => ({
                    ...q,
                    quiz_id: q.quiz_id?.toString() || null
                }))
            }
        };

        return NextResponse.json({
            success: true,
            battleId: newBattle.id,
            battle: sanitizedBattle
        });

    } catch (error: any) {
        console.error("[BATTLE REMATCH] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create rematch" },
            { status: 500 }
        );
    }
}
