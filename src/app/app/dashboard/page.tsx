import { redirect } from "next/navigation";
import { getDashboardData } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, BrainCircuit, Calendar, Flame, Trophy, Award } from "lucide-react";
import Link from "next/link";
import { HeroResumeCard } from "@/components/dashboard/HeroResumeCard";
import { WeaknessSniperList } from "@/components/dashboard/WeaknessSniperList";
import { BadgeIcon } from "@/components/ui/badge-icon";
import { RadarChartWrapper } from "@/components/dashboard/RadarChartWrapper";
import { MobileStatCard } from "@/components/dashboard/MobileStatCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const data = await getDashboardData();

    const { profile, metrics, weaknessList, resumeData, recentActivity } = data;
    const program = profile.program;

    if (!program) {
        redirect("/app/onboarding");
    }

    // Radar Chart Data is now fetched from actions
    const radarData = data.radarData || [];

    return (
        <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
            {/* --- MOBILE HEADER --- */}
            <div className="sticky top-0 z-40 flex items-center justify-between bg-white p-4 shadow-sm md:hidden">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-indigo-100">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.user_id}`} />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Welcome back,</p>
                        <p className="text-sm font-bold text-gray-900 leading-none">Student</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                        <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                        <span className="text-xs font-bold text-orange-600">{metrics.streak}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                        <Bell className="h-5 w-5 text-gray-600" />
                        <span className="absolute top-1.5 right-2 h-2 w-2 bg-red-500 rounded-full border border-white" />
                    </Button>
                </div>
            </div>

            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* --- WELCOME (Desktop Only) --- */}
                <div className="hidden md:flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Command Center</h1>
                        <p className="text-gray-500 mt-1">You are <span className="font-bold text-indigo-600">{metrics.readinessScore}% exam ready</span>. Keep pushing!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                            <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
                            <span className="font-bold text-gray-700">{metrics.streak} Day Streak</span>
                        </div>
                        <div className="text-sm text-gray-500">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                {/* --- MAIN GRID LAYOUT --- */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (Profile & Stats) */}
                    <div className="md:col-span-3 space-y-6">
                        {/* Desktop: Radar Chart */}
                        <Card className="hidden md:block border-none shadow-md overflow-hidden">
                            <CardHeader className="bg-white border-b border-gray-50 pb-3">
                                <CardTitle className="text-base font-semibold text-gray-800">Skill Radar</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 bg-white">
                                <RadarChartWrapper data={radarData} />
                            </CardContent>
                        </Card>

                        {/* Desktop: Quick Stats */}
                        <Card className="hidden md:block border-none shadow-md">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Syllabus Covered</span>
                                    <span className="font-bold text-gray-900">{metrics.syllabusCompletion}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${metrics.syllabusCompletion}%` }} />
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-sm text-gray-500">Quiz Average</span>
                                    <span className="font-bold text-gray-900">{metrics.quizAverage}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${metrics.quizAverage}%` }} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Mobile: Horizontal Stats Scroll */}
                        <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                            <div className="flex gap-3 w-max">
                                <MobileStatCard
                                    label="Readiness"
                                    value={`${metrics.readinessScore}%`}
                                    color="green"
                                    subtext="Exam Ready"
                                />
                                <MobileStatCard
                                    label="Weakness"
                                    value={weaknessList[0]?.subject || "None"}
                                    color="red"
                                    subtext="Focus Here"
                                />
                                <MobileStatCard
                                    label="Avg Score"
                                    value={`${metrics.quizAverage}%`}
                                    color="blue"
                                    subtext="Keep it up"
                                />
                                <MobileStatCard
                                    label="Streak"
                                    value={metrics.streak}
                                    color="purple"
                                    subtext="Days"
                                />
                            </div>
                        </div>
                    </div>

                    {/* CENTER COLUMN (Action) */}
                    <div className="md:col-span-6 space-y-6">
                        {/* Hero Card */}
                        {resumeData ? (
                            <HeroResumeCard
                                subject={resumeData.subject}
                                chapter={resumeData.chapter}
                                lastScore={resumeData.lastScore}
                                quizId={resumeData.quizId}
                            />
                        ) : (
                            <Card className="border-none shadow-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 text-center">
                                <h2 className="text-2xl font-bold mb-2">Start Your Journey</h2>
                                <p className="mb-6 opacity-90">Take your first quiz to get a personalized study plan.</p>
                                <Link href="/app/practice">
                                    <Button variant="secondary" size="lg" className="font-bold">Start Practice</Button>
                                </Link>
                            </Card>
                        )}

                        {/* Weakness Sniper */}
                        <WeaknessSniperList items={weaknessList} />

                        {/* Recent Activity */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 px-1">Recent Activity</h3>
                            {recentActivity.length > 0 ? recentActivity.map((quiz) => (
                                <Link key={quiz.id} href={`/app/practice/${quiz.id}/result`}>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${quiz.score >= 70 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                <BrainCircuit className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{quiz.chapter?.title || quiz.subject.name}</p>
                                                <p className="text-xs text-gray-500">{new Date(quiz.completed_at!).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block font-bold ${quiz.score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                                                {Math.round((quiz.score / quiz.total_points) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                                    No recent activity
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Gamification - Desktop Only) */}
                    <div className="hidden md:block md:col-span-3 space-y-6">
                        <Card className="border-none shadow-md bg-white">
                            <CardHeader className="pb-2 border-b border-gray-50">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Leaderboard
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="text-center py-6">
                                    <p className="text-gray-500 text-sm">Coming Soon</p>
                                    <p className="text-xs text-gray-400 mt-1">Compete with peers in your program</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-white">
                            <CardHeader className="pb-2 border-b border-gray-50">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    Upcoming Exams
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {data.upcomingExams && data.upcomingExams.length > 0 ? (
                                        data.upcomingExams.map((exam) => (
                                            <div key={exam.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                                                <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-center min-w-[50px]">
                                                    <span className="block text-xs font-bold uppercase">
                                                        {new Date(exam.date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </span>
                                                    <span className="block text-lg font-bold">
                                                        {new Date(exam.date).getDate()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {exam.description || (exam.program_id ? "Program Exam" : "General Exam")}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            No upcoming exams
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-white">
                            <CardHeader className="pb-2 border-b border-gray-50">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Award className="w-5 h-5 text-orange-500" />
                                    Your Badges
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex flex-wrap gap-2">
                                    {data.badges && data.badges.length > 0 ? (
                                        data.badges.map((userBadge) => (
                                            <div key={userBadge.id} className="flex flex-col items-center p-2 bg-gray-50 rounded-lg min-w-[70px]" title={userBadge.badge.name}>
                                                <BadgeIcon name={userBadge.badge.icon} className="w-6 h-6 text-orange-500" />
                                                <span className="text-[10px] font-medium text-gray-600 mt-1 text-center leading-tight">{userBadge.badge.name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center w-full py-4 text-gray-500 text-sm">
                                            Keep your streak to earn badges!
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </main>

        </div>
    );
}
