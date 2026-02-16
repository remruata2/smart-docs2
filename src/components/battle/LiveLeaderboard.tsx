"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Trophy, Medal, User } from "lucide-react";

interface Participant {
    user_id: number;
    user: {
        username: string;
        image?: string;
    };
    score: number;
    current_q_index: number;
    finished: boolean;
}

interface LiveLeaderboardProps {
    participants: Participant[];
    currentUserId: number;
    totalQuestions: number;
}

export function LiveLeaderboard({ participants, currentUserId, totalQuestions }: LiveLeaderboardProps) {
    // Sort participants by score (descending)
    const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);

    return (
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 backdrop-blur-xl h-full overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Live Standings
            </h3>

            <div className="space-y-3">
                {sortedParticipants.map((p, index) => {
                    const isCurrentUser = String(p.user_id) === String(currentUserId);
                    const progress = ((p.current_q_index) / totalQuestions) * 100;

                    return (
                        <div
                            key={p.user_id}
                            className={cn(
                                "relative p-3 rounded-xl border transition-all duration-300",
                                isCurrentUser
                                    ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                    : "bg-slate-800/40 border-slate-700"
                            )}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex-shrink-0 w-6 flex justify-center">
                                    {index === 0 ? (
                                        <Medal className="h-6 w-6 text-yellow-500" />
                                    ) : index === 1 ? (
                                        <Medal className="h-6 w-6 text-slate-400" />
                                    ) : index === 2 ? (
                                        <Medal className="h-6 w-6 text-amber-600" />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-500">#{index + 1}</span>
                                    )}
                                </div>

                                <Avatar className={cn("h-8 w-8 border", isCurrentUser ? "border-indigo-400" : "border-slate-600")}>
                                    <AvatarImage src={p.user.image} />
                                    <AvatarFallback className="bg-slate-800 text-xs text-slate-300">
                                        {p.user.username?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm font-semibold truncate", isCurrentUser ? "text-white" : "text-slate-200")}>
                                        {p.user.username} {isCurrentUser && "(You)"}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="font-mono text-lg font-bold text-emerald-400 leading-none">
                                        {p.score}
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Score</p>
                                </div>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="pl-9 pr-1">
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>Q {Math.min(p.current_q_index + 1, totalQuestions)}/{totalQuestions}</span>
                                    {p.finished && <span className="text-emerald-400 font-bold">FINISHED</span>}
                                </div>
                                <Progress
                                    value={p.finished ? 100 : progress}
                                    className="h-1.5 bg-slate-700"
                                    indicatorClassName={cn(
                                        p.finished ? "bg-emerald-500" : isCurrentUser ? "bg-indigo-500" : "bg-slate-500"
                                    )}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
