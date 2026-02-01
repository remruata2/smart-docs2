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
import { BattleLobbyRoom } from "@/components/battle/BattleLobbyRoom";
import { LiveLeaderboard } from "@/components/battle/LiveLeaderboard";
import { useSupabase } from "@/components/providers/supabase-provider";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface BattleArenaProps {
    battle: any;
    currentUser: any;
    courseId?: string;
    supabaseConfig: {
        url: string;
        anonKey: string;
    };
}

export function BattleArena({ battle: initialBattle, currentUser, courseId, supabaseConfig }: BattleArenaProps) {
    // Opponent state (derived early for initialization)
    const initialMyParticipant = initialBattle.participants.find((p: any) => p.user_id === currentUser.id);
    const { updatePresenceStatus, joinCourseRoom, leaveCourseRoom } = useSupabase();

    const router = useRouter();
    const [battle, setBattle] = useState(initialBattle);
    // Initialize currentQIndex from saved progress if available
    const [currentQIndex, setCurrentQIndex] = useState(initialMyParticipant?.current_q_index || 0);
    const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
    const [waiting, setWaiting] = useState(initialBattle.status === "WAITING");
    const [timeLeft, setTimeLeft] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [supabase, setSupabase] = useState<any>(null);

    // Initialize Supabase client - only once
    useEffect(() => {
        if (supabaseConfig.url && supabaseConfig.anonKey && !supabase) {
            console.log("[BATTLE] Initializing Supabase client");
            setSupabase(createClient(supabaseConfig.url, supabaseConfig.anonKey));
        }
    }, [supabaseConfig.url, supabaseConfig.anonKey, supabase]);

    // Sync state with props when router.refresh() updates the server component
    useEffect(() => {
        setBattle(initialBattle);
    }, [initialBattle]);

    // Track presence status separately from client initialization
    useEffect(() => {
        if (!supabase) return;

        // Join the presence room if provided
        if (courseId) {
            joinCourseRoom(courseId);
        }

        // Only set IN_GAME if we are actually playing (not waiting)
        const currentStatus = (!waiting && (battle.status === 'IN_PROGRESS' || battle.status === 'COMPLETED'))
            ? 'IN_GAME'
            : 'IN_LOBBY';

        updatePresenceStatus(currentStatus);

        return () => {
            // Leave room on unmount
            if (courseId) {
                leaveCourseRoom();
            }
        };
    }, [supabase, updatePresenceStatus, waiting, battle.status, courseId, joinCourseRoom, leaveCourseRoom]);

    // Refs to track latest state for intervals/callbacks
    const battleRef = useRef(battle);
    const isLeavingRef = useRef(false);
    const hasShownCompletionToast = useRef(false);
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
            const res = await fetch(`/api/battle/${currentBattle.id}`, { cache: 'no-store' });
            console.log('[BATTLE-FETCH] Fetched data code:', res.status);
            if (res.ok) {
                const data = await res.json();
                if (data.battle) {
                    console.log('[BATTLE-FETCH] Participants:', data.battle.participants.map((p: any) => `${p.user.username}: ${p.finished}`));
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
                    if (data.battle.status === 'COMPLETED' && !hasShownCompletionToast.current) {
                        hasShownCompletionToast.current = true;
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
                    if (payload.payload.userId && payload.payload.userId !== currentUser.id) {
                        toast.info("Opponent left the lobby");
                        fetchBattleData();
                    }
                    return;
                }

                if (payload.payload?.type === 'READY_UPDATE') {
                    // Update local state for ready status without full fetch
                    setBattle((prev: any) => ({
                        ...prev,
                        participants: prev.participants.map((p: any) =>
                            p.user_id === payload.payload.userId ? { ...p, is_ready: payload.payload.isReady } : p
                        )
                    }));
                    return;
                }

                if (payload.payload?.type === 'PLAYER_JOINED') {
                    const joinedUser = payload.payload.user;
                    if (joinedUser) {
                        toast.success(`${joinedUser.username} joined the battle!`);
                    }
                    if (waiting) {
                        // Force fetch to update participant list in Lobby
                        fetchBattleData();
                        router.refresh();
                    }
                    return;
                }

                if (payload.payload?.type === 'PLAYER_KICKED') {
                    const kickedId = payload.payload.userId;
                    if (Number(kickedId) === currentUser.id) {
                        toast.error("You have been kicked from the battle.");
                        router.push('/app/practice/battle');
                    } else {
                        toast.info("A player was kicked.");
                        fetchBattleData();
                    }
                    return;
                }

                // Optimistic status updates
                if (payload.payload?.status === 'IN_PROGRESS' || payload.payload?.type === 'START') {
                    setBattle((prev: any) => ({ ...prev, status: 'IN_PROGRESS' }));
                    setWaiting(false);
                }

                // Handle PROGRESS (Score/Finish) immediately
                if (payload.payload?.type === 'PROGRESS') {
                    const { userId, score, finished } = payload.payload;
                    console.log(`[BATTLE-REALTIME] Updating progress for user ${userId}: Score ${score}, Finished ${finished}`);
                    console.log(`[BATTLE-REALTIME] Current Participants:`, battle.participants.map((p: any) => `${p.user_id} (${typeof p.user_id})`));
                    console.log(`[BATTLE-REALTIME] Target userId: ${userId} (${typeof userId})`);

                    setBattle((prev: any) => ({
                        ...prev,
                        participants: prev.participants.map((p: any) =>
                            Number(p.user_id) === Number(userId) ? { ...p, score, finished } : p
                        )
                    }));
                }

                // Handle COMPLETION immediately
                if (payload.payload?.status === 'COMPLETED') {
                    console.log('[BATTLE-REALTIME] Battle COMPLETED received');
                    setBattle((prev: any) => ({ ...prev, status: 'COMPLETED' }));
                    // Ensure the toast fires
                    if (!hasShownCompletionToast.current) {
                        hasShownCompletionToast.current = true;
                        toast.success("Battle Completed!");
                    }
                    // Force fetch to get final results/ranks
                    fetchBattleData();
                    return;
                }

                // Don't fetch if we know it's completed
                if (battleRef.current.status === 'COMPLETED') return;

                console.log('[BATTLE-REALTIME] Fetching latest battle data due to update:', payload.payload?.type);
                fetchBattleData();
            })
            .on('broadcast', { event: 'REMATCH' }, (payload: any) => {
                console.log('[BATTLE-REALTIME] ✅ Received REMATCH:', payload);
                if (payload.payload?.newBattleId) {
                    // If I am the requester, I'm already redirected by the API response (or should be)
                    // But if I'm the opponent, I need to join
                    if (payload.payload.requesterId !== currentUser.id) {
                        toast.custom((t) => (
                            <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <span className="text-2xl">🔄</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">
                                            Rematch Requested!
                                        </p>
                                        <p className="text-sm text-slate-400 mt-1">
                                            Opponent wants to play again.
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    toast.dismiss(t);
                                                    handleJoinRematch(payload.payload.newBattleCode);
                                                }}
                                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-emerald-400 hover:to-green-500 transition-all"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => toast.dismiss(t)}
                                                className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600 transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ), { duration: Infinity });
                    }
                }
            })
            .on('broadcast', { event: 'CHALLENGE_DECLINED' }, (payload: any) => {
                console.log('[BATTLE-REALTIME] ✅ Received CHALLENGE_DECLINED:', payload);
                const declinedBy = payload.payload?.declinedBy || 'The challenger';
                toast.error(`${declinedBy} declined the challenge`);
                router.push('/app/practice/battle');
            })
            .subscribe((status: string) => {
                console.log('[BATTLE-REALTIME] Subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('[BATTLE-REALTIME] Successfully subscribed to channel');
                    // Signal presence to force refresh for others (e.g. host sees joiner)
                    channel.send({
                        type: 'broadcast',
                        event: 'BATTLE_UPDATE',
                        payload: { type: 'JOIN', userId: currentUser.id }
                    });
                }
            });

        return () => {
            console.log('[BATTLE-REALTIME] Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [battle.id, supabase]);

    // Removed polling - now relying entirely on Supabase Realtime broadcasts

    // Global Timer logic
    useEffect(() => {
        if (waiting || starting || battle.status !== "IN_PROGRESS" || myParticipant?.finished) return;

        const updateTimer = () => {
            if (!battle.started_at) return;

            const now = Date.now();
            const startTime = new Date(battle.started_at).getTime();
            const durationMs = (battle.duration_minutes || 5) * 60 * 1000;
            const endTime = startTime + durationMs;
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

            setTimeLeft(remaining);

            if (remaining <= 0) {
                // Time up! Force finish.
                handleTimeUp();
            }
        };

        // Immediate update to avoid 1s lag
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [waiting, starting, battle.status, battle.started_at, battle.duration_minutes, myParticipant?.finished]);

    const handleTimeUp = async () => {
        // Prevent multiple calls
        if (submitting) return;
        setSubmitting(true);

        toast.error("Time's up!");

        try {
            await fetch("/api/battle/update-progress", {
                method: "POST",
                body: JSON.stringify({
                    battleId: battle.id,
                    score: myParticipant?.score || 0,
                    questionIndex: currentQIndex,
                    finished: true
                })
            });

            // Local update
            setBattle((prev: any) => ({
                ...prev,
                participants: prev.participants.map((p: any) =>
                    p.user_id === currentUser.id
                        ? { ...p, finished: true }
                        : p
                )
            }));
        } catch (e) {
            console.error("Error submitting time up:", e);
        } finally {
            setSubmitting(false);
        }
    };

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
                fetch("/api/battle/leave-battle", {
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

    const handleLeave = () => {
        if (leaving || isLeavingRef.current) return;
        setLeaving(true);
        isLeavingRef.current = true; // Mark as intentionally leaving

        // Optimistic UI: Redirect immediately
        router.push('/app/practice/battle');
        toast.success("Left lobby");

        // Fire request in background
        fetch("/api/battle/leave-battle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ battleId: battle.id }),
            keepalive: true
        }).catch(err => console.error("Background leave error:", err));
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
                setTimeLeft(0); // Optional: Reset to 0 visually or leave as is (global timer continues)
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

    {/* Waiting (Lobby) State */ }
    if (waiting && !starting) {
        return (
            <BattleLobbyRoom
                battle={battle}
                currentUser={currentUser}
                participants={battle.participants.filter((p: any) => p.user_id !== currentUser.id)}
                supabase={supabase}
                isHost={battle.created_by === currentUser.id}
                onStart={handleStart}
                onLeave={handleLeave}
                isLeaving={leaving}
            />
        );
    }

    // Completed State
    if (battle.status === 'COMPLETED' || myParticipant?.finished) {
        return <BattleResult battle={battle} currentUser={currentUser} />;
    }

    // Battle Interface
    const question = battle.quiz.questions[currentQIndex];

    if (!question) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Countdown Overlay */}
            {starting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600 animate-bounce">
                        {countdown}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="relative z-10 border-b border-indigo-500/20 bg-slate-900/50 backdrop-blur-md p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={handleLeave} disabled={leaving} className="text-slate-400 hover:text-red-400">
                            {leaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                            Leave
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                {battle.quiz.title}
                            </h1>
                            <p className="text-xs text-slate-400">
                                Question {currentQIndex + 1} of {battle.quiz.questions.length}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                            <Clock className={cn("h-4 w-4", timeLeft < 60 ? "text-red-500 animate-pulse" : "text-indigo-400")} />
                            <span className={cn("font-mono font-bold", timeLeft < 60 ? "text-red-500" : "text-white")}>
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </div>
                <Progress
                    value={Math.min(100, (timeLeft / ((battle.duration_minutes || 5) * 60)) * 100)}
                    className="h-1 absolute bottom-0 left-0 right-0 rounded-none bg-transparent"
                    indicatorClassName={cn(timeLeft < 60 ? "bg-red-500" : "bg-indigo-500")}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 p-4 md:p-6 overflow-hidden">
                <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Question Area (Left - 8 cols) */}
                    <div className="lg:col-span-8 flex flex-col justify-center h-full">
                        <QuestionCard
                            questionType={question.question_type}
                            questionNumber={currentQIndex + 1}
                            totalQuestions={battle.quiz.questions.length}
                            points={question.points}
                            className="bg-slate-900/80 border-slate-800 shadow-2xl backdrop-blur-sm dark w-full"
                        >
                            <div className="space-y-2 md:space-y-4 py-1">
                                <div className="text-base md:text-lg font-medium leading-relaxed text-slate-100 prose prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ node, ...props }) => <p {...props} />,
                                        }}
                                    >
                                        {question.question_text}
                                    </ReactMarkdown>
                                </div>

                                <div className="grid gap-2 md:gap-3">
                                    {question.options?.map((opt: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedAnswer(opt)}
                                            className={`
                                                group relative w-full p-2.5 md:p-3 text-left rounded-lg border transition-all duration-200
                                                hover:bg-slate-800
                                                ${selectedAnswer === opt
                                                    ? "bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                                    : "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    h-6 w-6 rounded flex items-center justify-center text-xs font-bold border transition-colors
                                                    ${selectedAnswer === opt
                                                        ? "bg-indigo-500 border-indigo-400 text-white"
                                                        : "bg-slate-700 border-slate-600 text-slate-400 group-hover:border-slate-500"
                                                    }
                                                `}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={`text-sm ${selectedAnswer === opt ? "text-white font-medium" : "text-slate-300"}`}>
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                        components={{
                                                            p: ({ node, ...props }) => <span {...props} />,
                                                        }}
                                                    >
                                                        {opt}
                                                    </ReactMarkdown>
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </QuestionCard>

                        <div className="mt-6">
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
                    </div>

                    {/* Leaderboard (Right - 4 cols) */}
                    <div className="hidden lg:block lg:col-span-4 h-full max-h-[calc(100vh-140px)]">
                        <LiveLeaderboard
                            participants={[...battle.participants]}
                            currentUserId={currentUser.id}
                            totalQuestions={battle.quiz.questions.length}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
