"use client";

import { Medal, Trophy, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderboardEntry {
    userId: number;
    username: string;
    points: number;
}

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    currentUserId?: number;
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
        if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
        if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
        return <span className="font-bold text-muted-foreground">#{index + 1}</span>;
    };

    const getRowClassName = (userId: number, index: number) => {
        const isCurrentUser = userId === currentUserId;
        const baseClass = "flex items-center justify-between p-4 rounded-lg transition-all";

        if (isCurrentUser) {
            return `${baseClass} bg-indigo-50 border-2 border-indigo-300 shadow-md`;
        }

        if (index < 3) {
            return `${baseClass} bg-gradient-to-r from-amber-50 to-yellow-50 hover:shadow-md`;
        }

        return `${baseClass} hover:bg-gray-50`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>No rankings yet. Complete quizzes to earn points!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry, index) => (
                            <div key={entry.userId} className={getRowClassName(entry.userId, index)}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 flex justify-center">
                                        {getRankIcon(index)}
                                    </div>

                                    <Avatar className="w-10 h-10 border-2 border-gray-200">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                                            {entry.username[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 max-w-[200px]">
                                        <p className="font-semibold truncate">
                                            {entry.username}
                                            {entry.userId === currentUserId && (
                                                <span className="ml-2 text-xs text-indigo-600 font-normal">(You)</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-primary">
                                        {entry.points}
                                    </span>
                                    <span className="text-sm text-muted-foreground">pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
