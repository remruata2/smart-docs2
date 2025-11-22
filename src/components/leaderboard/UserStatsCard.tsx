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
    const getRankBadge = (rank: number | null) => {
        if (!rank) return { color: "bg-gray-500", text: "Unranked" };
        if (rank === 1) return { color: "bg-yellow-500", text: `#${rank}` };
        if (rank === 2) return { color: "bg-gray-400", text: `#${rank}` };
        if (rank === 3) return { color: "bg-amber-600", text: `#${rank}` };
        if (rank <= 10) return { color: "bg-blue-500", text: `#${rank}` };
        return { color: "bg-indigo-500", text: `#${rank}` };
    };

    const rankBadge = getRankBadge(stats.rank);

    return (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Trophy className="w-5 h-5" />
                    Your Performance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Badge className={`${rankBadge.color} text-white text-lg px-4 py-2`}>
                                {rankBadge.text}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Global Rank</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <Target className="w-5 h-5 text-purple-600" />
                            <span className="text-2xl font-bold text-purple-600">{stats.totalPoints}</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Total Points</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <Award className="w-5 h-5 text-blue-600" />
                            <span className="text-2xl font-bold text-blue-600">{stats.quizCount}</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Quizzes</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="text-2xl font-bold text-green-600">{stats.avgScore}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">Avg Score</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
