import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getUserStatsAction } from "@/app/app/practice/actions"; // We'll use this
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Zap,
    Users,
    CheckCircle2,
    Trophy,
    Medal,
    Clock,
    BarChart3,
    ChevronRight,
    Swords
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PracticeModeCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    bgClass: string;
    textClass: string;
    href: string;
}

function PracticeModeCard({ icon: Icon, title, description, color, bgClass, textClass, href }: PracticeModeCardProps) {
    return (
        <Link href={href} className="block group">
            <Card className="h-full border-slate-200 dark:border-slate-800 transition-all hover:shadow-lg hover:border-primary/20">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", bgClass)}>
                        <Icon className={cn("w-7 h-7", textClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                </CardContent>
            </Card>
        </Link>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    value: string | number;
    label: string;
    colorClass: string;
}

function StatCard({ icon: Icon, value, label, colorClass }: StatCardProps) {
    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 flex flex-col items-center text-center">
                <Icon className={cn("w-8 h-8 mb-3", colorClass)} />
                <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1">{value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
            </CardContent>
        </Card>
    );
}

export default async function PracticePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    // Fetch stats
    const stats: any = await getUserStatsAction().catch(() => ({
        tests_completed: 0,
        accuracy: 0,
        battles_won: 0,
        total_points: 0
    }));

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Practice Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Master your subjects with AI-powered tools</p>
                </div>
            </div>

            {/* Quick Start Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Start
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PracticeModeCard
                        icon={Zap} // Flash icon
                        title="Quick Mock Test"
                        description="Generate a personalized mock test from your chapters"
                        color="#4f46e5"
                        bgClass="bg-indigo-500/10"
                        textClass="text-indigo-600 dark:text-indigo-400"
                        href="/app/practice/mock"
                    />
                    <PracticeModeCard
                        icon={Users} // People icon
                        title="Battle Mode"
                        description="Challenge friends in real-time quiz battles"
                        color="#22c55e"
                        bgClass="bg-green-500/10"
                        textClass="text-green-600 dark:text-green-400"
                        href="/app/practice/battle"
                    />
                </div>
            </section>

            {/* Stats Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Your Stats
                </h2>
                <div className="grid grid-cols-3 gap-3 md:gap-6">
                    <StatCard
                        icon={CheckCircle2}
                        value={stats.tests_completed || 0}
                        label="Tests"
                        colorClass="text-green-500" // checkmark-circle color
                    />
                    <StatCard
                        icon={Trophy}
                        value={`${stats.accuracy || 0}%`}
                        label="Accuracy"
                        colorClass="text-amber-500" // trophy color
                    />
                    <StatCard
                        icon={Medal}
                        value={stats.battles_won || 0}
                        label="Battles Won"
                        colorClass="text-indigo-500" // medal color
                    />
                </div>
            </section>

            {/* More Options Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                    More
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PracticeModeCard
                        icon={Clock}
                        title="Test History"
                        description="Review your past tests and performance"
                        color="#64748b"
                        bgClass="bg-slate-500/10"
                        textClass="text-slate-600 dark:text-slate-400"
                        href="/app/practice/history"
                    />
                    <PracticeModeCard
                        icon={Trophy} // Podium icon
                        title="Leaderboard"
                        description="See how you rank against other students"
                        color="#f59e0b"
                        bgClass="bg-amber-500/10"
                        textClass="text-amber-600 dark:text-amber-400"
                        href="/app/leaderboard"
                    />
                </div>
            </section>

        </div>
    );
}
