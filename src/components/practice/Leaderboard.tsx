"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";
import { getLeaderboardAction } from "@/app/app/practice/actions";

interface LeaderboardEntry {
    userId: number;
    username: string;
    points: number;
}

export function Leaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLeaderboardAction()
            .then(setEntries)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Leaderboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Students
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {entries.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No points yet. Be the first!</p>
                    ) : (
                        entries.map((entry, index) => (
                            <div key={entry.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 flex justify-center font-bold text-muted-foreground">
                                        {index === 0 ? <Medal className="w-5 h-5 text-yellow-500" /> :
                                            index === 1 ? <Medal className="w-5 h-5 text-gray-400" /> :
                                                index === 2 ? <Medal className="w-5 h-5 text-amber-600" /> :
                                                    `#${index + 1}`}
                                    </div>
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.username}`} />
                                        <AvatarFallback>{entry.username[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium truncate max-w-[120px]">{entry.username}</span>
                                </div>
                                <div className="font-bold text-primary">
                                    {entry.points} pts
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
