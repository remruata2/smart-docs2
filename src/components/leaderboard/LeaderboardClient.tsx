"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeaderboardList } from "./LeaderboardList";
import { getLeaderboardData, LeaderboardEntry, LeaderboardScope, LeaderboardMetric } from "@/app/app/leaderboard/actions";
import { Loader2, School, Globe, Trophy, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LeaderboardClientProps {
    initialEntries: LeaderboardEntry[];
    initialUserRank: number | null;
    userContext: {
        programName?: string;
        boardName?: string;
        institutionName?: string;
        hasInstitution: boolean;
    };
    enrolledCourses: { id: number; title: string }[];
}

export function LeaderboardClient({ initialEntries, initialUserRank, userContext, enrolledCourses }: LeaderboardClientProps) {
    const defaultScope = enrolledCourses.length > 0 ? "COURSE" : (userContext.hasInstitution ? "INSTITUTION" : "BOARD");
    const [scope, setScope] = useState<LeaderboardScope | "COURSE">(defaultScope);
    const [selectedCourseId, setSelectedCourseId] = useState<string>(enrolledCourses[0]?.id.toString() || "");
    const [metric, setMetric] = useState<LeaderboardMetric>("POINTS");
    const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
    const [currentUserRank, setCurrentUserRank] = useState<number | null>(initialUserRank);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch data when scope or metric changes
    // Skip first render if initial data matches default state (which it should if we pass correct initial data)
    // Actually, simpler to just fetch on change.

    const handleScopeChange = async (newScope: string) => {
        const s = newScope as LeaderboardScope | "COURSE";
        setScope(s);
        await fetchData(s, metric, s === "COURSE" ? parseInt(selectedCourseId) : undefined);
    };

    const handleCourseChange = async (courseId: string) => {
        setSelectedCourseId(courseId);
        if (scope === "COURSE") {
            await fetchData("COURSE", metric, parseInt(courseId));
        }
    };

    const handleMetricChange = async (newMetric: string) => {
        const m = newMetric as LeaderboardMetric;
        setMetric(m);
        await fetchData(scope, m, scope === "COURSE" ? parseInt(selectedCourseId) : undefined);
    };

    const fetchData = async (s: LeaderboardScope | "COURSE", m: LeaderboardMetric, courseId?: number) => {
        setIsLoading(true);
        try {
            const data = await getLeaderboardData(s, m, courseId);
            if (data) {
                setEntries(data.entries);
                setCurrentUserRank(data.currentUserRank);
            } else {
                setEntries([]);
                setCurrentUserRank(null);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Context Info */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-muted/30 p-4 rounded-lg border">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        {scope === "COURSE" ? (
                            <>
                                <Trophy className="w-5 h-5 text-primary" />
                                {enrolledCourses.find(c => c.id.toString() === selectedCourseId)?.title || "Course"} Leaderboard
                            </>
                        ) : scope === "INSTITUTION" ? (
                            <>
                                <School className="w-5 h-5 text-primary" />
                                {userContext.institutionName || "Institution"} Leaderboard
                            </>
                        ) : (
                            <>
                                <Globe className="w-5 h-5 text-primary" />
                                {userContext.boardName || "National"} Leaderboard
                            </>
                        )}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {scope === "COURSE"
                            ? "Ranking among all enrolled students in this course"
                            : `Ranking for students in ${userContext.programName || "the program"}`
                        }
                    </p>
                </div>

                <div className="flex flex-wrap items-center bg-muted p-1 rounded-lg gap-1">
                    {enrolledCourses.length > 0 && (
                        <div className="flex items-center gap-2 mr-2">
                            {scope === "COURSE" && (
                                <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                                    <SelectTrigger className="h-8 w-[180px] bg-background">
                                        <SelectValue placeholder="Select Course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {enrolledCourses.map(course => (
                                            <SelectItem key={course.id} value={course.id.toString()}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <button
                                onClick={() => handleScopeChange("COURSE")}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${scope === "COURSE"
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Course
                            </button>
                        </div>
                    )}

                    {userContext.hasInstitution && (
                        <button
                            onClick={() => handleScopeChange("INSTITUTION")}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${scope === "INSTITUTION"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Institution
                        </button>
                    )}

                    <button
                        onClick={() => handleScopeChange("BOARD")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${scope === "BOARD"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        National
                    </button>
                </div>
            </div>

            {/* User Rank Message (if not in top 100) */}
            {currentUserRank && currentUserRank > 100 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 p-4 rounded-lg flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-green-800 dark:text-green-300 font-medium">
                        You are currently ranked <span className="font-bold">#{currentUserRank}</span> on this leaderboard. Keep going to reach the top 100!
                    </p>
                </div>
            )}

            {/* Metric Tabs */}
            <Tabs defaultValue="POINTS" value={metric} onValueChange={handleMetricChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="POINTS" className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        By Points
                    </TabsTrigger>
                    <TabsTrigger value="AVG_SCORE" className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        By Average Score
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="POINTS" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Students by Points</CardTitle>
                            <CardDescription>
                                Earn points by completing quizzes, daily streaks, and more.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <LeaderboardList entries={entries} metric="POINTS" />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="AVG_SCORE" className="mt-0">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Students by Average Score</CardTitle>
                            <CardDescription>
                                Based on your performance across all completed quizzes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <LeaderboardList entries={entries} metric="AVG_SCORE" />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
