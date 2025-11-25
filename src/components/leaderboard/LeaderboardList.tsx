import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";
import { LeaderboardEntry } from "@/app/app/leaderboard/actions";

interface LeaderboardListProps {
    entries: LeaderboardEntry[];
    metric: "POINTS" | "AVG_SCORE";
}

export function LeaderboardList({ entries, metric }: LeaderboardListProps) {
    if (entries.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No data available for this leaderboard yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {entries.map((entry) => (
                <Card
                    key={entry.userId}
                    className={cn(
                        "transition-all duration-200 hover:shadow-md border-l-4",
                        entry.isCurrentUser
                            ? "bg-green-600 text-white border-l-transparent"
                            : "border-l-transparent"
                    )}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        {/* Rank */}
                        <div className="w-12 flex-shrink-0 flex justify-center">
                            {entry.rank === 1 ? (
                                <Trophy className="w-8 h-8 text-yellow-500" />
                            ) : entry.rank === 2 ? (
                                <Medal className="w-8 h-8 text-gray-400" />
                            ) : entry.rank === 3 ? (
                                <Medal className="w-8 h-8 text-amber-600" />
                            ) : (
                                <span className={cn(
                                    "text-xl font-bold",
                                    entry.isCurrentUser ? "text-white" : "text-muted-foreground"
                                )}>
                                    #{entry.rank}
                                </span>
                            )}
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10 border-2 border-background">
                                <AvatarImage src={entry.avatarUrl || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                    {entry.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <p className={cn("font-semibold truncate", entry.isCurrentUser ? "text-white" : "")}>
                                    {entry.username}
                                    {entry.isCurrentUser && " (You)"}
                                </p>
                            </div>
                        </div>

                        {/* Score/Value */}
                        <div className="text-right">
                            <div className="text-xl font-bold tabular-nums">
                                {metric === "POINTS" ? (
                                    entry.value.toLocaleString()
                                ) : (
                                    `${entry.value}%`
                                )}
                            </div>
                            <div className={cn(
                                "text-xs uppercase tracking-wider",
                                entry.isCurrentUser ? "text-green-100" : "text-muted-foreground"
                            )}>
                                {metric === "POINTS" ? "Points" : "Avg Score"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
