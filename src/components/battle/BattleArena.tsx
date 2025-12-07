"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Trophy, Clock, Users, Copy, Swords, LogOut } from "lucide-react";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { createClient } from "@supabase/supabase-js";

import { BattleResult } from "@/components/battle/BattleResult";

interface BattleArenaProps {
    battle: any;
    currentUser: any;
    supabaseConfig: {
        url: string;
        anonKey: string;
    };
}

export function BattleArena({ battle: initialBattle, currentUser, supabaseConfig }: BattleArenaProps) {
    // Opponent state (derived early for initialization)
    const initialMyParticipant = initialBattle.participants.find((p: any) => p.user_id === currentUser.id);

    const router = useRouter();
    const [battle, setBattle] = useState(initialBattle);
    // Initialize currentQIndex from saved progress if available
    const [currentQIndex, setCurrentQIndex] = useState(initialMyParticipant?.current_q_index || 0);
    const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
    const [waiting, setWaiting] = useState(initialBattle.status === "WAITING");
    const [timeLeft, setTimeLeft] = useState(15); // Default 15s per question
    const [submitting, setSubmitting] = useState(false);
    const [supabase, setSupabase] = useState<any>(null);

    // Initialize Supabase client
    useEffect(() => {
        if (supabaseConfig.url && supabaseConfig.anonKey) {
            setSupabase(createClient(supabaseConfig.url, supabaseConfig.anonKey));
        }
    }, [supabaseConfig]);

    // Refs to track latest state for intervals/callbacks
    const battleRef = useRef(battle);
    const isLeavingRef = useRef(false);
    useEffect(() => { battleRef.current = battle; }, [battle]);

    // Derived state
    const opponent = battle.participants.find((p: any) => p.user_id !== currentUser.id);
    const myParticipant = battle.participants.find((p: any) => p.user_id === currentUser.id);

    // Additional state for countdown
    const [starting, setStarting] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Helper functions (defined early to avoid hoisting issues)
    const handleJoinRematch = async (code: string) => {
        try {
            const res = await fetch("/api/battle/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code })
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to join rematch");
                return;
            }

            const data = await res.json();
            router.push(`/app/practice/battle/${data.battle.id}`);
        } catch (error) {
            console.error("Error joining rematch:", error);
            toast.error("Failed to join rematch");
        }
    };

    const fetchBattleData = async () => {
        const currentBattle = battleRef.current;
        const currentMyParticipant = currentBattle.participants.find((p: any) => p.user_id === currentUser.id);

        try {
            const res = await fetch(`/api/battle/${currentBattle.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.battle) {
                    // Prevent reverting status from IN_PROGRESS to WAITING due to race condition
                    if (currentBattle.status === 'IN_PROGRESS' && data.battle.status === 'WAITING') {
                        data.battle.status = 'IN_PROGRESS';
                    }

                    // Prevent reverting finished status if we know we are finished
                    // This fixes the persistent polling issue where stale server data restarts the interval
                    if (currentMyParticipant?.finished) {
                        const serverMyPart = data.battle.participants.find((p: any) => p.user_id === currentUser.id);
                        if (serverMyPart) {
                            serverMyPart.finished = true;
                            // Ensure score doesn't revert either
                            serverMyPart.score = Math.max(serverMyPart.score, currentMyParticipant.score);
                            serverMyPart.current_q_index = Math.max(serverMyPart.current_q_index, currentMyParticipant.current_q_index);
                        }
                    }

                    setBattle(data.battle);

                    // Also update waiting status if changed
                    if (data.battle.status === 'IN_PROGRESS') setWaiting(false);
                    if (data.battle.status === 'COMPLETED') {
                        toast.success("Battle Completed!");
                        // Redirect to results or show summary
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch battle data:", e);
        }
    };

    // Check for completion moved to bottom to avoid hook errors

    // Realtime subscription
    useEffect(() => {
        if (!supabase) {
            console.warn('[BATTLE-REALTIME] Supabase client not available');
            return;
        }

        console.log('[BATTLE-REALTIME] Setting up subscription for battle:', battle.id);

        const channel = supabase.channel(`battle:${battle.id}`)
            .on('broadcast', { event: 'BATTLE_UPDATE' }, (payload: any) => {
                console.log('[BATTLE-REALTIME] ✅ Received BATTLE_UPDATE:', payload);

                if (payload.payload?.type === 'BATTLE_CANCELLED') {
                    toast.error("Battle was cancelled by the host");
                    router.push('/app/practice/battle');
                    return;
                }

                if (payload.payload?.type === 'PARTICIPANT_LEFT') {
                    if (payload.payload.userId !== currentUser.id) {
                        toast.info("Opponent left the lobby");
                        // Refresh data to show waiting state again
                        fetchBattleData();
                    }
                    return;
                }

                // Optimistic update for faster sync
                if (payload.payload?.status === 'IN_PROGRESS') {
                    console.log('[BATTLE-REALTIME] Updating status to IN_PROGRESS');
                    setBattle((prev: any) => ({ ...prev, status: 'IN_PROGRESS' }));
                }

                console.log('[BATTLE-REALTIME] Fetching latest battle data...');
                fetchBattleData();
            })
            .on('broadcast', { event: 'REMATCH' }, (payload: any) => {
                console.log('[BATTLE-REALTIME] ✅ Received REMATCH:', payload);
                if (payload.payload?.newBattleId) {
                    // If I am the requester, I'm already redirected by the API response (or should be)
                    // But if I'm the opponent, I need to join
                    if (payload.payload.requesterId !== currentUser.id) {
                        toast.success("Opponent wants a rematch!", {
                            action: {
                                label: "Join",
                                onClick: () => handleJoinRematch(payload.payload.newBattleCode)
                            },
                            duration: 10000,
                        });
                    }
                }
            })
            .subscribe((status: string) => {
                console.log('[BATTLE-REALTIME] Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('[BATTLE-REALTIME] Successfully subscribed to channel');
                    // Signal presence to force refresh for others (e.g. host sees joiner)
                    channel.send({
                        type: 'broadcast',
                        event: 'BATTLE_UPDATE',
                        payload: { type: 'JOIN' }
                    });
                }
            });

        return () => {
            console.log('[BATTLE-REALTIME] Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [battle.id, supabase]);

    // Removed polling - now relying entirely on Supabase Realtime broadcasts

    // Timer logic
    useEffect(() => {
        if (waiting || starting || battle.status === "COMPLETED" || myParticipant?.finished) return;

        if (timeLeft <= 0) {
            handleAnswer(true); // Auto-submit on timeout
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev: number) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, waiting, starting, battle.status, myParticipant?.finished]);

    // Start countdown logic
    useEffect(() => {
        if (battle.status === "IN_PROGRESS" && initialBattle.status === "WAITING") {
            setStarting(true);
            setWaiting(false);
            let count = 3;
            setCountdown(count);

            const interval = setInterval(() => {
                count--;
                setCountdown(count);
                if (count <= 0) {
                    clearInterval(interval);
                    setStarting(false);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [battle.status]);

    // Handle unmount / navigation away
    useEffect(() => {
        const handleUnload = () => {
            if (isLeavingRef.current) return; // Already handled manually

            const currentBattle = battleRef.current;
            const myPart = currentBattle.participants.find((p: any) => p.user_id === currentUser.id);

            // Only leave if battle is active AND I haven't finished
            const isActive = currentBattle.status === 'WAITING' || currentBattle.status === 'IN_PROGRESS';
            const isNotFinished = !myPart?.finished && currentBattle.status !== 'COMPLETED';

            if (isActive && isNotFinished) {
                // Use fetch with keepalive to ensure request sends during unload
                fetch("/api/battle/leave", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ battleId: currentBattle.id }),
                    keepalive: true
                });
            }
        };

        // Handle tab close / refresh
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            // Do NOT call handleUnload() here during cleanup to prevent accidental leave in Strict Mode
            // Users must explicitly click "Leave" or close the tab (handled by beforeunload)
        };
    }, [currentUser.id]);

    // Check for completion - AFTER all hooks to avoid "Rendered fewer hooks than expected" error
    if (myParticipant?.finished || battle.status === "COMPLETED") {
        return <BattleResult battle={battle} currentUser={currentUser} />;
    }

    const handleStart = async () => {
        try {
            const res = await fetch("/api/battle/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ battleId: battle.id })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to start battle");
            }

            // Optimistic update
            setBattle((prev: any) => ({ ...prev, status: "IN_PROGRESS" }));

            // Signal start to everyone
            if (supabase) {
                const channel = supabase.channel(`battle:${battle.id}`);
                await channel.send({
                    type: 'broadcast',
                    event: 'BATTLE_UPDATE',
                    payload: { type: 'START' }
                });
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to start battle");
        }
    };

    const handleLeave = async () => {
        isLeavingRef.current = true; // Mark as intentionally leaving
        try {
            const res = await fetch("/api/battle/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ battleId: battle.id })
            });

            if (res.ok) {
                router.push('/app/practice/battle');
                toast.success("Left lobby");
            } else {
                toast.error("Failed to leave lobby");
            }
        } catch (e) {
            console.error("Error leaving lobby:", e);
            toast.error("Failed to leave lobby");
        }
    };

    const handleAnswer = async (autoSubmit: boolean | any = false) => {
        // If called from button click, autoSubmit will be the event object, so treat as false
        const isAuto = typeof autoSubmit === 'boolean' ? autoSubmit : false;

        if (submitting) return;
        setSubmitting(true);

        const question = battle.quiz.questions[currentQIndex];

        console.log('[BATTLE-ANSWER] ========== Answer Validation ==========');
        console.log('[BATTLE-ANSWER] Question:', question.question_text);
        console.log('[BATTLE-ANSWER] Question Type:', question.question_type);
        console.log('[BATTLE-ANSWER] Selected Answer:', selectedAnswer, 'Type:', typeof selectedAnswer);
        console.log('[BATTLE-ANSWER] Correct Answer:', question.correct_answer, 'Type:', typeof question.correct_answer);
        console.log('[BATTLE-ANSWER] Options:', question.options);
        console.log('[BATTLE-ANSWER] Is Auto-submit:', isAuto);

        // Validation logic - only if not auto-submit (timeout)
        let isCorrect = false;

        if (!isAuto && selectedAnswer !== null) {
            if (question.question_type === "MCQ" || question.question_type === "TRUE_FALSE") {
                // For MCQ/TF, compare exact match
                const selectedLower = String(selectedAnswer).toLowerCase().trim();
                const correctLower = String(question.correct_answer).toLowerCase().trim();

                console.log('[BATTLE-ANSWER] Comparing (lowercase, trimmed):');
                console.log('[BATTLE-ANSWER]   Selected:', `"${selectedLower}"`);
                console.log('[BATTLE-ANSWER]   Correct:', `"${correctLower}"`);

                isCorrect = selectedLower === correctLower;
                console.log('[BATTLE-ANSWER] String match result:', isCorrect);

                // Fallback: if correct_answer is an index (0, 1, 2...)
                if (!isCorrect && typeof question.correct_answer === 'number') {
                    const options = question.options as string[];
                    if (options && options[question.correct_answer] === selectedAnswer) {
                        isCorrect = true;
                        console.log('[BATTLE-ANSWER] Index match result: true');
                    }
                }
            } else {
                // For text answers, simple case-insensitive match
                isCorrect = String(selectedAnswer).toLowerCase().trim() === String(question.correct_answer).toLowerCase().trim();
            }
        }

        console.log('[BATTLE-ANSWER] Final isCorrect:', isCorrect);
        console.log('[BATTLE-ANSWER] =====================================\n');

        // No points on timeout or no answer
        const points = isCorrect ? question.points : 0;
        const newScore = (myParticipant?.score || 0) + points;

        const finished = currentQIndex >= battle.quiz.questions.length - 1;

        try {
            await fetch("/api/battle/update-progress", {
                method: "POST",
                body: JSON.stringify({
                    battleId: battle.id,
                    score: newScore,
                    questionIndex: currentQIndex + 1,
                    finished
                })
            });

            // Signal progress update
            if (supabase) {
                const channel = supabase.channel(`battle:${battle.id}`);
                await channel.send({
                    type: 'broadcast',
                    event: 'BATTLE_UPDATE',
                    payload: { type: 'PROGRESS', userId: currentUser.id }
                });
            }

            if (isCorrect) {
                toast.success(`Correct! +${points} pts`);
            } else if (isAuto) {
                toast.error("Time's up! No points");
            } else if (!isAuto) {
                toast.error("Incorrect!");
            }

            if (finished) {
                toast.success("You finished!");
                // Force local update to show results immediately
                setBattle((prev: any) => ({
                    ...prev,
                    participants: prev.participants.map((p: any) =>
                        p.user_id === currentUser.id
                            ? { ...p, score: newScore, finished: true }
                            : p
                    )
                }));
            } else {
                setCurrentQIndex((prev: number) => prev + 1);
                setSelectedAnswer(null);
                setTimeLeft(15);
            }
        } catch (e) {
            toast.error("Failed to submit answer");
        } finally {
            setSubmitting(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(battle.code);
        toast.success("Code copied!");
    };

    if (starting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
                <div className="z-10 flex flex-col items-center animate-in zoom-in duration-500">
                    <h2 className="text-4xl font-bold text-indigo-400 mb-4">Get Ready!</h2>
                    <div className="text-9xl font-black bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                        {countdown}
                    </div>
                </div>
            </div>
        );
    }

    if (waiting) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-start pt-20 md:justify-center md:pt-0 p-4 bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-hidden">
                {/* Background Effects */}

                {/* Animated Grid Background */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

                <div className="bg-slate-900/50 backdrop-blur-xl p-4 md:p-8 rounded-3xl max-w-md w-full text-center space-y-4 md:space-y-8 border border-slate-800 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
                    <div className="space-y-1 md:space-y-2 relative">
                        {/* Leave Button */}
                        <div className="absolute left-0 top-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLeave}
                                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                title="Leave Lobby"
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>

                        <h2 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            BATTLE LOBBY
                        </h2>
                        <p className="text-sm md:text-base text-slate-400">Waiting for players to join...</p>
                    </div>

                    <div className="py-4 md:py-8 relative">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full" />
                        <p className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 md:mb-4">Join Code</p>
                        <div className="flex items-center justify-center gap-3 md:gap-4">
                            <span className="text-4xl md:text-6xl font-mono font-bold tracking-widest text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                                {battle.code}
                            </span>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={copyCode}
                                className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white transition-all"
                            >
                                <Copy className="h-4 w-4 md:h-5 md:w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                        <div className="flex items-center justify-between bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-700/50">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg text-sm md:text-base">
                                    {currentUser.username?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-white text-sm md:text-base">{currentUser.username}</span>
                                    <span className="text-[10px] md:text-xs text-indigo-300">You</span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-bold border border-emerald-500/20">
                                READY
                            </span>
                        </div>

                        {opponent ? (
                            <div className="flex items-center justify-between bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-700/50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-lg text-sm md:text-base">
                                        {opponent.user?.username?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-white text-sm md:text-base">{opponent.user?.username || "Opponent"}</span>
                                        <span className="text-[10px] md:text-xs text-rose-300">Challenger</span>
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-bold border border-emerald-500/20">
                                    READY
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 md:p-8 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 gap-2 md:gap-3 animate-pulse bg-slate-900/30">
                                <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-indigo-500/50" />
                                <span className="text-xs md:text-sm font-medium">Waiting for opponent...</span>
                            </div>
                        )}
                    </div>

                    {battle.created_by === currentUser.id && (
                        <Button
                            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                            disabled={!opponent}
                            onClick={handleStart}
                        >
                            {opponent ? (
                                <span className="flex items-center gap-2">
                                    <Swords className="h-6 w-6" />
                                    START BATTLE
                                </span>
                            ) : (
                                "Waiting for Player..."
                            )}
                        </Button>
                    )}

                    {battle.created_by !== currentUser.id && (
                        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm animate-pulse flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Waiting for host to start...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Battle Interface
    const question = battle.quiz.questions[currentQIndex];
    if (!question) return <div>Battle Finished!</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-2 md:p-4 font-sans selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 relative z-10 pt-2 md:pt-8">

                {/* Header / Timer Bar */}
                <div className="lg:col-span-12 flex items-center justify-between bg-slate-900/50 backdrop-blur-md border border-slate-800 p-3 md:p-4 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Clock className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wider">Time</span>
                            <span className={`text-xl md:text-2xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {timeLeft}s
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wider">Round</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xl md:text-2xl font-bold text-white">{currentQIndex + 1}</span>
                            <span className="text-base md:text-lg text-slate-500">/</span>
                            <span className="text-base md:text-lg text-slate-500">{battle.quiz.questions.length}</span>
                        </div>
                    </div>
                </div>

                {/* Mobile Live Points Bar (Top) */}
                <div className="lg:hidden flex items-center justify-between gap-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 p-2 rounded-xl">
                    {/* My Score Compact */}
                    <div className="flex items-center gap-2 flex-1 bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20">
                        <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-[10px]">
                            YOU
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white leading-none">{myParticipant?.score || 0}</span>
                            <Progress
                                value={((myParticipant?.current_q_index || 0) / battle.quiz.questions.length) * 100}
                                className="h-1 w-12 bg-slate-800 mt-1"
                                indicatorClassName="bg-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Opponent Score Compact */}
                    <div className="flex items-center gap-2 flex-1 justify-end bg-slate-800/30 rounded-lg p-2 border border-slate-700/50">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-200 leading-none">{opponent?.score || 0}</span>
                            <Progress
                                value={((opponent?.current_q_index || 0) / battle.quiz.questions.length) * 100}
                                className="h-1 w-12 bg-slate-800 mt-1"
                                indicatorClassName="bg-rose-500"
                            />
                        </div>
                        <div className="h-6 w-6 rounded-full bg-rose-500 flex items-center justify-center font-bold text-white text-[10px]">
                            OPP
                        </div>
                    </div>
                </div>

                {/* Main Quiz Area */}
                <div className="lg:col-span-8 space-y-4 md:space-y-6">
                    <QuestionCard
                        questionType={question.question_type}
                        questionNumber={currentQIndex + 1}
                        totalQuestions={battle.quiz.questions.length}
                        points={question.points}
                        className="bg-slate-900/80 border-slate-800 shadow-2xl backdrop-blur-sm dark" // Force dark mode
                    >
                        <div className="space-y-4 md:space-y-8 py-2">
                            <p className="text-lg md:text-2xl font-medium leading-relaxed text-slate-100">
                                {question.question_text}
                            </p>

                            <div className="grid gap-3 md:gap-4">
                                {question.options?.map((opt: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedAnswer(opt)}
                                        className={`
                                            group relative w-full p-3 md:p-5 text-left rounded-xl border-2 transition-all duration-200
                                            hover:scale-[1.01] active:scale-[0.99]
                                            ${selectedAnswer === opt
                                                ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                                : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className={`
                                                h-6 w-6 md:h-8 md:w-8 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold border transition-colors
                                                ${selectedAnswer === opt
                                                    ? "bg-indigo-500 border-indigo-400 text-white"
                                                    : "bg-slate-700 border-slate-600 text-slate-400 group-hover:border-slate-500"
                                                }
                                            `}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`text-sm md:text-lg ${selectedAnswer === opt ? "text-white font-medium" : "text-slate-300"}`}>
                                                {opt}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </QuestionCard>

                    <Button
                        className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => handleAnswer(false)}
                        disabled={!selectedAnswer || submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                                Locking in...
                            </>
                        ) : (
                            "Submit Answer"
                        )}
                    </Button>
                </div>

                {/* Desktop Sidebar / Opponent Status */}
                <div className="hidden lg:block lg:col-span-4 space-y-6">
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6 sticky top-8">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Live Standings
                        </h3>

                        <div className="space-y-6">
                            {/* My Score */}
                            <div className="space-y-3 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
                                            YOU
                                        </div>
                                        <span className="font-medium text-indigo-200">You</span>
                                    </div>
                                    <span className="font-bold text-2xl text-white">{myParticipant?.score || 0}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-indigo-300/70">
                                        <span>Progress</span>
                                        <span>{Math.round(((myParticipant?.current_q_index || 0) / battle.quiz.questions.length) * 100)}%</span>
                                    </div>
                                    <Progress
                                        value={((myParticipant?.current_q_index || 0) / battle.quiz.questions.length) * 100}
                                        className="h-2 bg-slate-800"
                                        indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Opponent Score */}
                            <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-rose-500 flex items-center justify-center font-bold text-white text-xs">
                                            OPP
                                        </div>
                                        <span className="font-medium text-slate-300">{opponent?.user?.username || "Opponent"}</span>
                                    </div>
                                    <span className="font-bold text-2xl text-slate-200">{opponent?.score || 0}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Progress</span>
                                        <span>{Math.round(((opponent?.current_q_index || 0) / battle.quiz.questions.length) * 100)}%</span>
                                    </div>
                                    <Progress
                                        value={((opponent?.current_q_index || 0) / battle.quiz.questions.length) * 100}
                                        className="h-2 bg-slate-800"
                                        indicatorClassName="bg-rose-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
