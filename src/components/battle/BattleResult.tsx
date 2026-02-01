"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Trophy, Home, Swords, Loader2, Frown, Medal } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BattleResultProps {
    battle: any;
    currentUser: any;
}

export function BattleResult({ battle, currentUser }: BattleResultProps) {
    const router = useRouter();
    const { sendChallenge, updatePresenceStatus } = useSupabase();
    const [rematchLoading, setRematchLoading] = useState(false);
    const myParticipant = battle.participants.find((p: any) => p.user_id === currentUser.id);
    const opponent = battle.participants.find((p: any) => p.user_id !== currentUser.id);

    // Use RANK to determine winner (Rank 1 is winner, regardless of score ties)
    // Ranking logic in backend handles score > time tie-breakers
    const iWon = myParticipant?.rank === 1;
    const isDraw = false; // "Draw" concept is removed in favor of strict ranking (Time tie-breaker)
    const opponentFinished = opponent?.finished;
    const battleCompleted = battle.status === "COMPLETED";

    const handleRematch = async () => {
        setRematchLoading(true);
        try {
            const res = await fetch("/api/battle/rematch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ battleId: battle.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Send challenges to all previous participants (except self)
            const invites = battle.participants
                .filter((p: any) => p.user_id !== currentUser.id)
                .map((p: any) => p.user);

            if (invites.length > 0) {
                toast.info(`Inviting ${invites.length} previous player${invites.length > 1 ? 's' : ''}...`);

                // Send invites in parallel
                await Promise.all(invites.map((user: any) =>
                    sendChallenge(
                        user.id,
                        user.username,
                        data.battleId,
                        data.battleCode, // We need to ensure API returns this or we fetch it
                        battle.quiz.subject?.name || "Quiz Battle",
                        battle.quiz.chapter?.title || "Rematch"
                    ).catch(e => console.error(`Failed to invite ${user.username}`, e))
                ));
            }

            toast.success("Rematch created! Redirecting...");

            // Redirect to new battle
            updatePresenceStatus('IN_LOBBY');
            router.push(`/app/practice/battle/${data.battleId}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to create rematch");
        } finally {
            setRematchLoading(false);
        }
    };

    // Calculate Max Possible Score
    const maxScore = battle.quiz?.questions?.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-hidden flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-700">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm flex flex-col items-center gap-2">
                        <span>{battleCompleted ? (iWon ? "VICTORY!" : isDraw ? "DRAW!" : "DEFEAT") : "FINISHED!"}</span>
                        {battleCompleted && myParticipant?.points_change !== undefined && (
                            <span className={`text-2xl md:text-4xl ${myParticipant.points_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {myParticipant.points_change > 0 ? '+' : ''}{myParticipant.points_change} pts
                            </span>
                        )}
                    </h1>
                    <p className="text-xl text-slate-400">
                        {battleCompleted
                            ? "The battle has ended. Here are the results."
                            : "You have completed the quiz. Waiting for opponent..."}
                    </p>
                </div>

                {/* Leaderboard List */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-800 overflow-hidden max-h-[60vh] overflow-y-auto">
                    <div className="divide-y divide-slate-800">
                        {battle.participants
                            .sort((a: any, b: any) => {
                                if (b.score !== a.score) return b.score - a.score;
                                // Tie-breaker: completion time (earlier is better)
                                const aTime = a.completed_at ? new Date(a.completed_at).getTime() : Infinity;
                                const bTime = b.completed_at ? new Date(b.completed_at).getTime() : Infinity;
                                return aTime - bTime;
                            })
                            .map((p: any, index: number) => {
                                const isMe = p.user_id === currentUser.id;
                                const isWinner = index === 0;
                                const place = index + 1;

                                return (
                                    <div
                                        key={p.user_id}
                                        className={`
                                            flex items-center gap-4 p-4 md:p-6 transition-colors
                                            ${isMe ? 'bg-indigo-500/10' : 'hover:bg-slate-800/30'}
                                            ${isWinner ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}
                                        `}
                                    >
                                        {/* Rank */}
                                        <div className={`
                                            flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl font-black text-lg md:text-xl
                                            ${index === 0 ? 'bg-yellow-500 text-yellow-950 shadow-lg shadow-yellow-500/20' :
                                                index === 1 ? 'bg-slate-300 text-slate-900' :
                                                    index === 2 ? 'bg-amber-700 text-amber-100' :
                                                        'bg-slate-800 text-slate-500 border border-slate-700'}
                                        `}>
                                            {index < 3 ? <Trophy className="h-5 w-5 md:h-6 md:w-6" /> : `#${place}`}
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-bold text-base md:text-lg truncate ${isMe ? 'text-indigo-400' : 'text-slate-200'}`}>
                                                    {p.user?.username || "Unknown"}
                                                </h3>
                                                {isMe && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">You</span>}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-slate-500">
                                                    {p.finished ? (
                                                        <span className="flex items-center gap-1.5 ">
                                                            <span>Finished</span>
                                                            {p.completed_at && battle.started_at && (
                                                                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                                                                    {(() => {
                                                                        const start = new Date(battle.started_at).getTime();
                                                                        const end = new Date(p.completed_at).getTime();
                                                                        const seconds = Math.floor((end - start) / 1000);
                                                                        const m = Math.floor(seconds / 60);
                                                                        const s = seconds % 60;
                                                                        return `${m}m ${s}s`;
                                                                    })()}
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        "Still playing..."
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="text-right">
                                            <div className="text-2xl md:text-3xl font-black text-white leading-none">
                                                {p.score} <span className="text-base font-medium text-slate-500">/ {maxScore}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Score</div>

                                            {/* Points Change Display - Only if Battle Completed */}
                                            {battleCompleted && p.points_change !== undefined && (
                                                <div className={`text-xs font-bold ${p.points_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {p.points_change > 0 ? '+' : ''}{p.points_change} pts
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                <div className="flex justify-center gap-4 pt-8">
                    <Link href="/app/practice/battle">
                        <Button className="h-14 px-8 text-lg font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl shadow-lg transition-all hover:scale-105">
                            <Home className="mr-2 h-5 w-5" />
                            Lobby
                        </Button>
                    </Link>
                    <Button
                        onClick={handleRematch}
                        disabled={rematchLoading}
                        className="h-14 px-8 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {rematchLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Swords className="mr-2 h-5 w-5" />
                                Rematch
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
