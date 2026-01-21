import { redirect } from "next/navigation";
import { getDashboardData } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, BrainCircuit, Calendar, Flame, Trophy, Award, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { HeroResumeCard } from "@/components/dashboard/HeroResumeCard";
import { WeaknessSniperList } from "@/components/dashboard/WeaknessSniperList";
import { BadgeIcon } from "@/components/ui/badge-icon";
import { RadarChartWrapper } from "@/components/dashboard/RadarChartWrapper";
import { MobileStatCard } from "@/components/dashboard/MobileStatCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const data = await getDashboardData();

    const { profile, metrics, weaknessList, resumeData, recentActivity, enrollments } = data;

    // With Coursera model, users don't need a program - they just need enrollments
    // If no enrollments, redirect to catalog to browse courses
    if (!enrollments || enrollments.length === 0) {
        redirect("/");
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
                                    <span className="text-sm text-gray-500">Test Average</span>
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
                            </Card>
                        )}

                        {/* Enrolled Courses Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="font-bold text-gray-900 text-lg">My Subject Enrollments</h3>
                                <Link href="/app/catalog" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                    Browse Catalog
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {enrollments && enrollments.length > 0 ? enrollments.map((enrollment: any) => (
                                    <Link key={enrollment.id} href={`/app/subjects?courseId=${enrollment.course_id}`}>
                                        <Card className="hover:shadow-lg transition-all border-none bg-white overflow-hidden group">
                                            <CardContent className="p-0">
                                                <div className="flex gap-4 p-4">
                                                    <div className="w-16 h-16 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                                                        <BookOpen className="w-8 h-8 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-900 truncate leading-tight mb-1">
                                                            {enrollment.course.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mb-2">
                                                            {enrollment.course.subjects.length} Subjects • {enrollment.course.board_id}
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                                <span className="text-gray-400 uppercase">Progress</span>
                                                                <span className="text-indigo-600">{enrollment.progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                                <div
                                                                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000"
                                                                    style={{ width: `${enrollment.progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                )) : (
                                    <Card className="col-span-full border-dashed border-2 border-gray-200 bg-gray-50/50">
                                        <CardContent className="py-12 text-center">
                                            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium mb-4">No subjects enrolled yet</p>
                                            <Link href="/app/catalog">
                                                <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                                    Explore Catalog
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {/* Weakness Sniper */}
                        <WeaknessSniperList items={weaknessList} />

                        {/* Recent Activity */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 px-1">Recent Activity</h3>
                            {recentActivity.length > 0 ? recentActivity.map((quiz: any) => (
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
