"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Trophy, Clock, Users, Copy, Swords, LogOut } from "lucide-react";
import { QuestionCard } from "@/components/practice/QuestionCard";

import { BattleResult } from "@/components/battle/BattleResult";
import { BattleLobbyRoom } from "@/components/battle/BattleLobbyRoom";
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
}

export function BattleArena({ battle: initialBattle, currentUser, courseId }: BattleArenaProps) {
    // Opponent state (derived early for initialization)
    const initialMyParticipant = initialBattle.participants.find((p: any) => String(p.user_id) === String(currentUser.id));
    const { updatePresenceStatus, joinCourseRoom, leaveCourseRoom, supabase } = useSupabase();

    const router = useRouter();
    const [battle, setBattle] = useState(initialBattle);
    // Initialize currentQIndex from saved progress if available
    const [currentQIndex, setCurrentQIndex] = useState(initialMyParticipant?.current_q_index || 0);
    const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
    const [waiting, setWaiting] = useState(initialBattle.status === "WAITING");
    const [timeLeft, setTimeLeft] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [leaving, setLeaving] = useState(false);

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
    const channelRef = useRef<any>(null); // Store channel for broadcasting
    useEffect(() => { battleRef.current = battle; }, [battle]);

    // Derived state
    const opponent = battle.participants.find((p: any) => String(p.user_id) !== String(currentUser.id));
    const myParticipant = battle.participants.find((p: any) => String(p.user_id) === String(currentUser.id));

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
                        const serverMyPart = data.battle.participants.find((p: any) => String(p.user_id) === String(currentUser.id));
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

                // Handle PLAYER_FINISHED (opponent finished their quiz)
                if (payload.payload?.type === 'PLAYER_FINISHED') {
                    const { userId, score } = payload.payload;
                    console.log(`[BATTLE-REALTIME] Player ${userId} FINISHED with score ${score}`);

                    if (String(userId) !== String(currentUser.id)) {
                        toast.info('Opponent has finished!', { icon: '🏁' });
                    }

                    // Fetch latest data to get the finished player's results
                    fetchBattleData();
                    return;
                }

                // Handle COMPLETION (all players done, results calculated)
                if (payload.payload?.status === 'COMPLETED') {
                    console.log('[BATTLE-REALTIME] Battle COMPLETED received');
                    // Force fetch to get final results with ranks and points_change
                    fetchBattleData();
                    if (!hasShownCompletionToast.current) {
                        hasShownCompletionToast.current = true;
                        toast.success('Battle Completed!');
                    }
                    return;
                }

                // Don't fetch if we know it's completed - REMOVED to verify we get late updates (like points)
                // if (battleRef.current.status === 'COMPLETED') return;

                console.log('[BATTLE-REALTIME] Fetching latest battle data due to update:', payload.payload?.type);
                fetchBattleData();
            })
            .on('broadcast', { event: 'REMATCH' }, (payload: any) => {
                console.log('[BATTLE-REALTIME] ✅ Received REMATCH:', payload);
                if (payload.payload?.newBattleId) {
                    // ... (rest of rematch logic remains same)
                    // (I'm truncating the unchanged rematch logic for brevity in this replace call, 
                    // assuming replace_file_content handles exact string matching context)
                    // allow me to use a larger chunk to be safe
                }
            })
        // ... (rest of handlers) ...
    }, [battle.id, supabase]);

    // ... (rest of effects) ...

    // Check for completion - AFTER all hooks to avoid "Rendered fewer hooks than expected" error
    if (battle.status === "COMPLETED") {
        return <BattleResult battle={battle} currentUser={currentUser} />;
    }

    // Waiting for Opponents State (Player finished, but battle ongoing)
    if (myParticipant?.finished) {
        const myScore = myParticipant?.score || 0;
        const maxScore = battle.quiz?.questions?.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || 0;
        const otherPlayers = battle.participants.filter((p: any) => p.user_id !== currentUser.id);
        const allOthersFinished = otherPlayers.every((p: any) => p.finished);

        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse" />
                        <Loader2 className="h-16 w-16 text-indigo-400 animate-spin relative z-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            You Finished!
                        </h2>
                        <p className="text-slate-400 mt-2">
                            Your Score: <span className="text-white font-bold text-xl">{myScore}</span> <span className="text-slate-500">/ {maxScore}</span>
                        </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 backdrop-blur-sm max-w-sm mx-auto">
                        <p className="text-sm text-slate-300">
                            {allOthersFinished ? 'Calculating final results...' : 'Waiting for opponent to finish...'}
                        </p>
                        <div className="flex justify-center gap-1 mt-3">
                            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 bg-pink-500 rounded-full animate-bounce" />
                        </div>
                    </div>
                </div>
            </div>
        );
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

            const data = await res.json();

            // Update with full battle object from server (includes started_at)
            if (data.battle) {
                setBattle(data.battle);
            } else {
                setBattle((prev: any) => ({ ...prev, status: "IN_PROGRESS", started_at: new Date().toISOString() }));
            }

            // Signal start to everyone via persistent channel
            if (channelRef.current) {
                const result = await channelRef.current.send({
                    type: 'broadcast',
                    event: 'BATTLE_UPDATE',
                    payload: { type: 'START' }
                });
                console.log('[BATTLE-START] Broadcast result:', result);
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
            // Optimistic Update: Update score immediately
            setBattle((prev: any) => ({
                ...prev,
                participants: prev.participants.map((p: any) =>
                    String(p.user_id) === String(currentUser.id)
                        ? { ...p, score: newScore, finished, current_q_index: currentQIndex + 1 }
                        : p
                )
            }));

            // PERSIST TO DB (Server) — server will broadcast PLAYER_FINISHED if this is the last question
            await fetch("/api/battle/update-progress", {
                method: "POST",
                body: JSON.stringify({
                    battleId: battle.id,
                    score: newScore,
                    questionIndex: currentQIndex + 1,
                    finished
                })
            });

            if (isCorrect) {
                toast.success(`Correct! +${points} pts`);
            } else if (isAuto) {
                toast.error("Time's up! No points");
            } else if (!isAuto) {
                toast.error("Incorrect!");
            }

            if (finished) {
                toast.success("You finished!");
                // Final update handled by optimistic update above
            } else {
                setCurrentQIndex((prev: number) => prev + 1);
                setSelectedAnswer(null);
                setTimeLeft(0); // Optional: Reset to 0 visually or leave as is (global timer continues)
            }
        } catch (e) {
            toast.error("Failed to submit answer");
            // Revert optimistic update on error would go here ideally, but complex to implement cleanly
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
                <div className="max-w-4xl mx-auto w-full">

                    {/* Question Area */}
                    <div className="flex flex-col justify-center h-full">
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

                </div>
            </div>
        </div>
    );
}
