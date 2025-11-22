import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getUserStatsAction, getLeaderboardAction } from "@/app/app/practice/actions";
import { UserStatsCard } from "@/components/leaderboard/UserStatsCard";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { Trophy } from "lucide-react";

export default async function LeaderboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id as string);

    // Fetch data in parallel
    const [userStats, leaderboard] = await Promise.all([
        getUserStatsAction(),
        getLeaderboardAction(100), // Top 100 users
    ]);

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Leaderboard
                    </h1>
                </div>
                <p className="text-muted-foreground text-lg">
                    Compete with students and track your progress
                </p>
            </div>

            <div className="space-y-6">
                {/* User Stats */}
                <UserStatsCard stats={userStats} />

                {/* Leaderboard */}
                <LeaderboardTable entries={leaderboard} currentUserId={userId} />
            </div>
        </div>
    );
}
