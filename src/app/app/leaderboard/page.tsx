import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getUserStatsAction } from "@/app/app/practice/actions";
import { getLeaderboardData } from "@/app/app/leaderboard/actions";
import { UserStatsCard } from "@/components/leaderboard/UserStatsCard";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";
import { Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id as string);

    // Check latest enrollment for initial scope context
    const latestEnrollment = await prisma.userEnrollment.findFirst({
        where: { user_id: userId, status: "active" },
        orderBy: { last_accessed_at: "desc" }
    });

    // Fetch enrolled courses for selection
    const enrolledCourses = await prisma.userEnrollment.findMany({
        where: { user_id: userId, status: "active" },
        include: { course: { select: { id: true, title: true } } }
    });

    const initialScope = latestEnrollment ? "COURSE" : "BOARD";
    const initialCourseId = latestEnrollment?.course_id;

    const [userStats, leaderboardData] = await Promise.all([
        getUserStatsAction(),
        getLeaderboardData(initialScope, "POINTS", initialCourseId),
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

                {/* Advanced Leaderboard */}
                {leaderboardData ? (
                    <LeaderboardClient
                        initialEntries={leaderboardData.entries}
                        initialUserRank={leaderboardData.currentUserRank}
                        userContext={leaderboardData.userContext}
                        enrolledCourses={enrolledCourses.map(e => e.course)}
                    />
                ) : (
                    <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                        <p>Please join a program to view the leaderboard.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
