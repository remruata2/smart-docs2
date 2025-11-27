"use client";

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
    const [rematchLoading, setRematchLoading] = useState(false);
    const myParticipant = battle.participants.find((p: any) => p.user_id === currentUser.id);
    const opponent = battle.participants.find((p: any) => p.user_id !== currentUser.id);

    const iWon = myParticipant?.score > (opponent?.score || 0);
    const isDraw = myParticipant?.score === (opponent?.score || 0);
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

            toast.success("Rematch created! Redirecting...");

            // Redirect to new battle
            router.push(`/app/practice/battle/${data.battleId}`);
        } catch (error: any) {
            toast.error(error.message || "Failed to create rematch");
        } finally {
            setRematchLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-hidden flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

            <div className="max-w-2xl w-full space-y-8 relative z-10">
                <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-700">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-sm">
                        {battleCompleted ? (iWon ? "VICTORY!" : isDraw ? "DRAW!" : "DEFEAT") : "FINISHED!"}
                    </h1>
                    <p className="text-xl text-slate-400">
                        {battleCompleted
                            ? "The battle has ended. Here are the results."
                            : "You have completed the quiz. Waiting for opponent..."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* My Card */}
                    <div className={`relative overflow-hidden rounded-3xl p-6 border-2 ${iWon && battleCompleted ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-xl transition-all duration-500`}>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                                <div className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl ${iWon && battleCompleted ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                    {currentUser.username?.[0]?.toUpperCase()}
                                </div>
                                {iWon && battleCompleted && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-2 rounded-full shadow-lg animate-bounce">
                                        <Trophy className="h-6 w-6" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white">{currentUser.username}</h3>
                                <p className="text-indigo-300 font-medium">You</p>
                            </div>
                            <div className="w-full py-4 border-t border-slate-700/50">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-400 text-sm uppercase tracking-wider font-bold">Score</span>
                                    <span className="text-4xl font-black text-white">{myParticipant?.score || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Opponent Card */}
                    <div className={`relative overflow-hidden rounded-3xl p-6 border-2 ${!iWon && !isDraw && battleCompleted ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-xl transition-all duration-500`}>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                                <div className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl ${!iWon && !isDraw && battleCompleted ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-rose-500 to-orange-600'}`}>
                                    {opponent?.user?.username?.[0]?.toUpperCase() || "?"}
                                </div>
                                {!iWon && !isDraw && battleCompleted && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-2 rounded-full shadow-lg animate-bounce">
                                        <Trophy className="h-6 w-6" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white">{opponent?.user?.username || "Opponent"}</h3>
                                <p className="text-rose-300 font-medium">Challenger</p>
                            </div>
                            <div className="w-full py-4 border-t border-slate-700/50">
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-400 text-sm uppercase tracking-wider font-bold">Score</span>
                                    <span className="text-4xl font-black text-white">{opponent?.score || 0}</span>
                                </div>
                            </div>
                            {!battleCompleted && (
                                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-300 animate-pulse">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <span className="font-bold">Still playing...</span>
                                    </div>
                                </div>
                            )}
                        </div>
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
