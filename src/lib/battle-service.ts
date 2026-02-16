import { prisma } from "@/lib/prisma";
import { BattleStatus } from "@/generated/prisma";
import { supabaseAdmin } from "./supabase";

export class BattleService {
    /**
     * Generates a unique 6-digit code
     */
    static async generateBattleCode(): Promise<string> {
        let code = "";
        let exists = true;

        while (exists) {
            code = Math.floor(100000 + Math.random() * 900000).toString();
            const existing = await prisma.battle.findUnique({
                where: { code }
            });
            if (!existing) exists = false;
        }
        return code;
    }

    /**
     * Helper to broadcast events via Supabase Admin (server-side)
     * Uses httpSend for stateless server-to-client broadcasts
     */
    private static async broadcast(battleId: string, event: string, payload: any = {}) {
        if (!supabaseAdmin) {
            console.warn('[BATTLE-BROADCAST] supabaseAdmin not available');
            return;
        }

        console.log('[BATTLE-BROADCAST] Broadcasting:', { battleId, event, payloadType: payload?.type || payload?.status });

        const channel = supabaseAdmin.channel(`battle:${battleId}`);

        try {
            // @ts-ignore - httpSend is available but not in types
            if (typeof channel.httpSend === 'function') {
                // @ts-ignore
                const result = await channel.httpSend(event, payload);
                console.log('[BATTLE-BROADCAST] httpSend result:', result);
            } else {
                const result = await channel.send({
                    type: 'broadcast',
                    event,
                    payload
                });
                console.log('[BATTLE-BROADCAST] send result:', result);
            }
        } catch (error) {
            console.error('[BATTLE-BROADCAST] Error broadcasting:', error);
        }
    }

    /**
     * Creates a new battle
     */
    static async createBattle(userId: number, quizId: string, subjectName?: string, chapterName?: string, isPublic: boolean = true) {
        const code = await this.generateBattleCode();

        const battle = await prisma.battle.create({
            data: {
                code,
                quiz_id: quizId,
                created_by: userId,
                status: BattleStatus.WAITING,
                is_public: isPublic,
                // Store subject/chapter names as metadata if needed in future
                // For now, they are available via the quiz relation
                participants: {
                    create: {
                        user_id: userId,
                        joined_at: new Date(),
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { username: true, id: true }
                        }
                    }
                },
                quiz: {
                    select: {
                        title: true,
                        chapter_id: true,
                        chapter: {
                            select: {
                                title: true,
                                subject: {
                                    select: { name: true }
                                }
                            }
                        },
                        questions: {
                            select: { id: true, points: true }
                        }
                    }
                }
            }
        });

        return battle;
    }

    /**
     * Joins an existing battle
     */
    static async joinBattle(userId: number, code: string) {
        const battle = await prisma.battle.findUnique({
            where: { code },
            include: {
                participants: {
                    include: {
                        user: true
                    }
                }
            }
        });
        console.log(`[BATTLE SERVICE] joinBattle lookup for code "${code}" returned:`, battle ? `Battle ID ${battle.id}` : "null");

        if (!battle) {
            throw new Error("Battle not found");
        }

        if (battle.participants.length >= 8) {
            throw new Error("Lobby is full (Max 8 players)");
        }

        if (battle.status !== BattleStatus.WAITING) {
            throw new Error("Battle has already started or ended");
        }

        // Check if already joined (ensure type safety)
        // Check if already joined (ensure type safety)
        const isJoined = battle.participants.some((p: any) => Number(p.user_id) === Number(userId));
        if (isJoined) {
            console.log(`[BATTLE SERVICE] User ${userId} already in battle ${battle.id}`);

            // Reset ready status for re-joiners to ensure correct UI state
            await prisma.battleParticipant.updateMany({
                where: {
                    battle_id: battle.id,
                    user_id: userId
                },
                data: {
                    is_ready: false,
                    last_active: new Date()
                }
            });

            // Broadcast the reset/join update
            await this.broadcast(battle.id, 'BATTLE_UPDATE', {
                type: 'PLAYER_JOINED',
                user: battle.participants.find(p => Number(p.user_id) === Number(userId))?.user
            });

            return battle;
        }

        try {
            // Add participant
            const updatedBattle = await prisma.battle.update({
                where: { id: battle.id },
                data: {
                    participants: {
                        create: {
                            user_id: userId,
                            joined_at: new Date()
                        }
                    }
                },
                include: {
                    participants: {
                        include: { user: { select: { username: true, id: true } } }
                    },
                    quiz: {
                        select: {
                            title: true,
                            chapter_id: true,
                            questions: true
                        }
                    }
                }
            });

            // Find the joined user to broadcast details
            const joinedParticipant = updatedBattle.participants.find(p => p.user_id === userId);

            // Broadcast player join to notify all participants
            await this.broadcast(battle.id, 'BATTLE_UPDATE', {
                type: 'PLAYER_JOINED',
                user: joinedParticipant?.user
            });

            return updatedBattle;
        } catch (error: any) {
            // Handle unique constraint violation (P2002) - race condition where user joined in parallel
            if (error.code === 'P2002') {
                console.log(`[BATTLE SERVICE] Race condition: User ${userId} joined concurrently.`);
                return prisma.battle.findUnique({
                    where: { id: battle.id },
                    include: {
                        participants: {
                            include: { user: { select: { username: true, id: true } } }
                        },
                        quiz: {
                            select: {
                                title: true,
                                chapter_id: true,
                                questions: true
                            }
                        }
                    }
                });
            }
            throw error;
        }

    }

    /**
     * Updates participant ready status
     */
    static async setReady(battleId: string, userId: number, isReady: boolean) {
        const participant = await prisma.battleParticipant.update({
            where: {
                battle_id_user_id: {
                    battle_id: battleId,
                    user_id: userId
                }
            },
            data: {
                is_ready: isReady,
                last_active: new Date()
            }
        });

        // Broadcast ready update
        await this.broadcast(battleId, 'BATTLE_UPDATE', {
            type: 'READY_UPDATE',
            userId,
            isReady
        });

        return participant;
    }

    /**
     * Updates participant progress
     */
    static async updateProgress(battleId: string, userId: number, score: number, questionIndex: number, finished: boolean = false) {
        const participant = await prisma.battleParticipant.update({
            where: {
                battle_id_user_id: {
                    battle_id: battleId,
                    user_id: userId
                }
            },
            data: {
                score,
                current_q_index: questionIndex,
                finished,
                last_active: new Date(),
                ...(finished ? { completed_at: new Date() } : {})
            }
        });

        // Check if all participants finished
        if (finished) {
            // Broadcast that this player finished (so opponent's Result page updates)
            await this.broadcast(battleId, 'BATTLE_UPDATE', {
                type: 'PLAYER_FINISHED',
                userId,
                score,
            });

            const battle = await prisma.battle.findUnique({
                where: { id: battleId },
                include: { participants: true }
            });

            if (battle && battle.participants.every((p: { finished: boolean }) => p.finished)) {
                await prisma.battle.update({
                    where: { id: battleId },
                    data: {
                        status: BattleStatus.COMPLETED,
                        ended_at: new Date()
                    }
                });

                // Calculate Results (Ranks and Point Changes)
                await this.calculateBattleResults(battleId);

                // Broadcast completion so both clients transition to final results
                await this.broadcast(battleId, 'BATTLE_UPDATE', { status: 'COMPLETED' });
            }
        }

        return participant;
    }

    /**
     * Calculates and saves battle results (ranks and point changes)
     * Dynamic Stake System: Zero-sum + inflation
     */
    static async calculateBattleResults(battleId: string) {
        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { participants: true }
        });

        if (!battle) return;

        // Sort participants: Score DESC, then Time ASC (finished earlier is better)
        const sortedParticipants = [...battle.participants].sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Higher score wins
            }
            // Tie-breaker: Time
            const timeA = a.completed_at ? new Date(a.completed_at).getTime() : Infinity;
            const timeB = b.completed_at ? new Date(b.completed_at).getTime() : Infinity;
            return timeA - timeB; // Lower time wins
        });

        const topScore = sortedParticipants[0]?.score ?? 0;
        const isTiedZero = topScore === 0;

        const numPlayers = sortedParticipants.length;
        const participationBonus = isTiedZero ? 0 : 5; // No bonus if everyone got 0

        // Define base point distribution (before bonus)
        // If tied at 0, no one wins or loses points
        let distribution: number[] = [];

        if (isTiedZero) {
            distribution = new Array(numPlayers).fill(0);
        } else if (numPlayers === 2) {
            distribution = [20, -20];
        } else if (numPlayers === 3) {
            distribution = [25, 0, -25];
        } else if (numPlayers === 4) {
            distribution = [30, 10, -10, -30];
        } else if (numPlayers >= 5) {
            // General algorithm for N players:
            // Top half gaining, bottom half losing.
            // Example for 8: +50, +30, +15, +5 | -5, -15, -30, -50
            if (numPlayers === 5) distribution = [35, 15, 0, -15, -35];
            else if (numPlayers === 6) distribution = [40, 20, 5, -5, -20, -40];
            else if (numPlayers === 7) distribution = [45, 25, 10, 0, -10, -25, -45];
            else distribution = [50, 30, 15, 5, -5, -15, -30, -50]; // 8+
        } else {
            // 1 player?
            distribution = [0];
        }

        // Apply updates
        for (let i = 0; i < sortedParticipants.length; i++) {
            const participant = sortedParticipants[i];
            const basePoints = distribution[i] || 0; // Fallback 0
            const totalPointsChange = basePoints + participationBonus;
            const rank = i + 1;

            // 1. Update Participant Record
            await prisma.battleParticipant.update({
                where: { id: participant.id },
                data: {
                    rank: rank,
                    points_change: totalPointsChange
                }
            });

            // 2. Apply to User's GLobal Points (with integer overflow/negative protection)
            // First, calculate current total points to ensure we don't drop below 0
            const userPointsSum = await prisma.userPoints.aggregate({
                where: { user_id: participant.user_id },
                _sum: { points: true }
            });

            const currentTotal = userPointsSum._sum.points || 0;
            let finalPointsChange = totalPointsChange;

            // If losing points, ensure we don't go below 0
            if (finalPointsChange < 0 && (currentTotal + finalPointsChange < 0)) {
                finalPointsChange = -currentTotal; // Lose all remaining points to reach exactly 0
            }

            // Only insert if there's a change (or if we want to log 0 gain/loss)
            if (finalPointsChange !== 0 || totalPointsChange !== 0) {
                await prisma.userPoints.create({
                    data: {
                        user_id: participant.user_id,
                        points: finalPointsChange,
                        reason: 'battle_result',
                        metadata: {
                            battle_id: battleId,
                            rank: rank,
                            original_change: totalPointsChange // Track what they *would* have lost
                        }
                    }
                });
            }

            // Update local object for logging/UI return if needed
            participant.points_change = finalPointsChange;

            console.log(`[BATTLE RESULTS] User ${participant.user_id} Rank ${rank}: ${totalPointsChange} pts (${basePoints} + ${participationBonus})`);
        }
    }

    /**
     * Start the battle
     */
    static async startBattle(battleId: string, userId: number) {
        const battle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: { participants: true }
        });

        if (!battle) throw new Error("Battle not found");
        if (battle.created_by !== userId) throw new Error("Only creator can start battle");
        if (battle.participants.length < 2) throw new Error("Need at least 2 players to start");

        const updatedBattle = await prisma.battle.update({
            where: { id: battleId },
            data: {
                status: BattleStatus.IN_PROGRESS,
                started_at: new Date()
            }
        });

        await this.broadcast(battleId, 'BATTLE_UPDATE', {
            type: 'START',
            status: 'IN_PROGRESS'
        });

        return updatedBattle;
    }

    /**
     * Create a rematch with the same participants
     */
    static async rematchBattle(battleId: string, newQuizId: string, requesterId: number) {
        // Get original battle with participants
        const originalBattle = await prisma.battle.findUnique({
            where: { id: battleId },
            include: {
                participants: {
                    include: {
                        user: true
                    }
                }
            }
        });

        if (!originalBattle) throw new Error("Original battle not found");
        // Allow rematch for any battle size >= 2
        if (originalBattle.participants.length < 2) {
            throw new Error("Cannot rematch with fewer than 2 players");
        }

        // Generate new battle code
        const code = await this.generateBattleCode();

        // Create new battle with ONLY the requester
        const newBattle = await prisma.battle.create({
            data: {
                code,
                quiz_id: newQuizId,
                created_by: requesterId, // The requester becomes the creator
                status: BattleStatus.WAITING,
                participants: {
                    create: {
                        user_id: requesterId,
                        score: 0,
                        current_q_index: 0,
                        finished: false,
                        joined_at: new Date()
                    }
                }
            },
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

        // Broadcast rematch event to original battle channel
        // Broadcast rematch event to original battle channel
        await this.broadcast(battleId, 'REMATCH', {
            newBattleId: newBattle.id,
            newBattleCode: newBattle.code,
            requesterId: requesterId
        });

        return newBattle;
    }
}
