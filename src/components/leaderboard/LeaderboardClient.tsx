"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeaderboardList } from "./LeaderboardList";
import { getLeaderboardData, LeaderboardEntry, LeaderboardScope, LeaderboardMetric, LeaderboardTimeframe } from "@/app/app/leaderboard/actions";
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
        courseTitle?: string;
    };
    enrolledCourses: { id: number; title: string }[];
}

export function LeaderboardClient({ initialEntries, initialUserRank, userContext, enrolledCourses }: LeaderboardClientProps) {
    // Default to first course if available
    const [selectedCourseId, setSelectedCourseId] = useState<string>(enrolledCourses[0]?.id.toString() || "");
    const [metric, setMetric] = useState<LeaderboardMetric>("POINTS");
    const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>("weekly");
    const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
    const [currentUserRank, setCurrentUserRank] = useState<number | null>(initialUserRank);
    const [isLoading, setIsLoading] = useState(false);

    const handleCourseChange = async (courseId: string) => {
        setSelectedCourseId(courseId);
        await fetchData(metric, parseInt(courseId), timeframe);
    };

    const handleMetricChange = async (newMetric: string) => {
        const m = newMetric as LeaderboardMetric;
        setMetric(m);
        await fetchData(m, parseInt(selectedCourseId), timeframe);
    };

    const handleTimeframeChange = async (newTimeframe: LeaderboardTimeframe) => {
        setTimeframe(newTimeframe);
        await fetchData(metric, parseInt(selectedCourseId), newTimeframe);
    };

    const fetchData = async (m: LeaderboardMetric, courseId: number, tf: LeaderboardTimeframe) => {
        setIsLoading(true);
        try {
            // Always use scope "COURSE"
            const data = await getLeaderboardData("COURSE", m, courseId, tf);
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
        <div className="space-y-4">
            {/* Optimized Context/Filter Bar */}
            <div className="bg-white border border-slate-100 p-2 rounded-2xl shadow-sm space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <School className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Course Scope</span>
                    </div>

                    {/* Course Selector */}
                    {enrolledCourses.length > 0 && (
                        <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                            <SelectTrigger className="h-8 w-auto min-w-[120px] max-w-[180px] bg-slate-50 border-none text-[11px] font-bold rounded-lg focus:ring-0">
                                <SelectValue placeholder="Select Course" />
                            </SelectTrigger>
                            <SelectContent>
                                {enrolledCourses.map(course => (
                                    <SelectItem key={course.id} value={course.id.toString()} className="text-xs">
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Timeframe Selector - Compact Row */}
                <div className="flex items-center bg-slate-50 p-1 rounded-xl gap-1">
                    {(['weekly', 'monthly', 'all_time'] as const).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => handleTimeframeChange(tf)}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded-lg transition-all ${timeframe === tf
                                ? "bg-white shadow-sm text-indigo-600"
                                : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            {tf === 'weekly' ? 'Week' : tf === 'monthly' ? 'Month' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* User Rank Message (Compact) */}
            {currentUserRank && currentUserRank > 100 && (
                <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-[11px] text-indigo-700 font-bold leading-tight">
                        Ranked <span className="text-indigo-900 border-b border-indigo-200">#{currentUserRank}</span>. Keep pushing to reach the top 100!
                    </p>
                </div>
            )}

            {/* Metric Tabs - Optimized */}
            <Tabs defaultValue="POINTS" value={metric} onValueChange={handleMetricChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 p-1 rounded-2xl h-11">
                    <TabsTrigger value="POINTS" className="rounded-xl text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all">
                        <Trophy className="w-3.5 h-3.5 mr-1.5" />
                        BATTLE POINTS
                    </TabsTrigger>
                    <TabsTrigger value="AVG_SCORE" className="rounded-xl text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all">
                        <Percent className="w-3.5 h-3.5 mr-1.5" />
                        AVG SCORE
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="POINTS" className="mt-0">
                    <Card className="border-slate-100 rounded-2xl shadow-sm">
                        <CardContent className="p-0">
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
                    <Card className="border-slate-100 rounded-2xl shadow-sm">
                        <CardContent className="p-0">
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
