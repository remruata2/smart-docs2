"use client";

import { Trophy, Target, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserStatsCardProps {
    stats: {
        totalPoints: number;
        rank: number | null;
        quizCount: number;
        avgScore: number;
    };
}

export function UserStatsCard({ stats }: UserStatsCardProps) {
    return (
        <Card className="border-indigo-100 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0">
                <div className="flex items-stretch divide-x divide-slate-50">
                    {/* Rank Section */}
                    <div className="flex-1 p-4 bg-gradient-to-br from-indigo-600 to-indigo-700 flex flex-col items-center justify-center text-white">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Global Rank</span>
                        <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-2xl font-black tracking-tighter">#{stats.rank || "-"}</span>
                        </div>
                    </div>

                    {/* Points Section */}
                    <div className="flex-[1.2] p-4 flex flex-col items-center justify-center bg-slate-50/30">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Points</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                <Target className="w-3 h-3 text-purple-600" />
                            </div>
                            <span className="text-xl font-black text-slate-800 tracking-tight">{stats.totalPoints}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Row - Secondary Stats */}
                <div className="grid grid-cols-2 divide-x divide-slate-50 border-t border-slate-50">
                    <div className="p-3 flex items-center justify-center gap-2">
                        <Award className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[11px] font-bold text-slate-600">{stats.quizCount} Quizzes</span>
                    </div>
                    <div className="p-3 flex items-center justify-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[11px] font-bold text-slate-600">{stats.avgScore}% Avg Score</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
