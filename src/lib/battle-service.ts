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
     * Helper to broadcast events via Supabase
     */
    private static async broadcast(battleId: string, event: string, payload: any = {}) {
        if (!supabaseAdmin) {
            console.warn('[BATTLE-BROADCAST] supabaseAdmin not available');
            return;
        }

        console.log('[BATTLE-BROADCAST] Broadcasting:', { battleId, event, payload });

        const channel = supabaseAdmin.channel(`battle:${battleId}`);

        try {
            // Use httpSend if available to avoid fallback warning
            // @ts-ignore
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
    static async createBattle(userId: number, quizId: string) {
        const code = await this.generateBattleCode();

        const battle = await prisma.battle.create({
            data: {
                code,
                quiz_id: quizId,
                created_by: userId,
                status: BattleStatus.WAITING,
                participants: {
                    create: {
                        user_id: userId,
                        joined_at: new Date(),
                    }
                }
            },
            include: {
                quiz: {
                    select: {
                        title: true,
                        chapter_id: true,
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
            include: { participants: true }
        });
        console.log(`[BATTLE SERVICE] joinBattle lookup for code "${code}" returned:`, battle ? `Battle ID ${battle.id}` : "null");

        if (!battle) {
            throw new Error("Battle not found");
        }

        if (battle.status !== BattleStatus.WAITING) {
            throw new Error("Battle has already started or ended");
        }

        if (battle.participants.some((p: { user_id: number }) => p.user_id === userId)) {
            return battle; // Already joined
        }

        // Add participant
        const updatedBattle = await prisma.battle.update({
            where: { id: battle.id },
            data: {
                participants: {
                    create: {
                        user_id: userId,
                        joined_at: new Date()
                    }
                },
                // If we have 2 participants, we can start the countdown or wait for creator to start
                // For now, let's keep it manual start or auto-start logic in frontend
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

        // Broadcast player join to notify all participants
        await this.broadcast(battle.id, 'BATTLE_UPDATE', { type: 'PLAYER_JOINED', userId });

        return updatedBattle;
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
                last_active: new Date()
            }
        });

        // Check if all participants finished
        if (finished) {
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

                // Broadcast completion
                await this.broadcast(battleId, 'BATTLE_UPDATE', { status: 'COMPLETED' });
            }
        }

        // Broadcast progress update
        await this.broadcast(battleId, 'BATTLE_UPDATE', {
            type: 'PROGRESS',
            userId,
            score,
            finished
        });

        return participant;
    }

    /**
     * Start the battle
     */
    static async startBattle(battleId: string, userId: number) {
        const battle = await prisma.battle.findUnique({
            where: { id: battleId }
        });

        if (!battle) throw new Error("Battle not found");
        if (battle.created_by !== userId) throw new Error("Only creator can start battle");

        const updatedBattle = await prisma.battle.update({
            where: { id: battleId },
            data: {
                status: BattleStatus.IN_PROGRESS,
                started_at: new Date()
            }
        });

        await this.broadcast(battleId, 'BATTLE_UPDATE', { status: 'IN_PROGRESS' });

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
        if (originalBattle.participants.length !== 2) {
            throw new Error("Can only rematch 1v1 battles");
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
