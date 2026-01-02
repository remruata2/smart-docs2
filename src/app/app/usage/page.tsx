import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Zap, FileText, MessageSquare, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function UsagePage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id);

    // Get user subscription and plan
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            subscription: {
                include: {
                    plan: true
                }
            }
        }
    });

    // Get current usage for the current period
    // If no subscription, assume monthly period starting from 1st of month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const periodStart = user?.subscription?.current_period_start || startOfMonth;
    const periodEnd = user?.subscription?.current_period_end || endOfMonth;

    const usageRecords = await prisma.usageTracking.findMany({
        where: {
            user_id: userId,
            period_start: {
                gte: periodStart
            }
        }
    });

    // Helper to get usage count
    const getUsage = (type: string) => {
        const record = usageRecords.find(r => r.usage_type === type);
        return record?.count || 0;
    };

    // Default limits (Free tier)
    const defaultLimits = {
        ai_queries: 50,
        file_uploads: 0,
        quizzes: 10,
        storage_mb: 100
    };

    // Use plan limits if available, otherwise defaults
    const limits: any = user?.subscription?.plan?.limits || defaultLimits;

    // Calculate percentages
    const calculatePercent = (used: number, limit: number) => {
        if (limit === -1) return 0; // Unlimited
        if (limit === 0) return used > 0 ? 100 : 0;
        return Math.min(100, (used / limit) * 100);
    };

    const usageData = [
        {
            id: 'ai_processing',
            label: 'AI Processing (Tokens)',
            icon: Zap,
            used: getUsage('ai_processing'),
            limit: limits.ai_tokens || 100000,
            unit: 'tokens',
            color: 'bg-yellow-500'
        },
        {
            id: 'file_upload',
            label: 'File Uploads',
            icon: FileText,
            used: getUsage('file_upload'),
            limit: limits.file_uploads || 5,
            unit: 'files',
            color: 'bg-blue-500'
        },
        {
            id: 'chat_message',
            label: 'Chat Messages',
            icon: MessageSquare,
            used: getUsage('chat_message'),
            limit: limits.chat_messages || 50,
            unit: 'msgs',
            color: 'bg-green-500'
        },
        {
            id: 'quiz_generation',
            label: 'Quizzes Generated',
            icon: BrainCircuit,
            used: getUsage('quiz_generation'),
            limit: limits.quizzes || 10,
            unit: 'quizzes',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <Link href="/app/profile" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Profile
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Usage & Limits</h1>
                <p className="text-gray-500 mt-1">
                    Tracking for period: {format(new Date(periodStart), 'MMM d')} - {format(new Date(periodEnd), 'MMM d, yyyy')}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Plan Summary */}
                <Card className="bg-gradient-to-r from-indigo-50 to-white border-indigo-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-600 mb-1">Current Plan</p>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {user?.subscription?.plan?.display_name || "Free Plan"}
                            </h2>
                        </div>
                    </CardContent>
                </Card>

                {/* Usage Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {usageData.map((item) => {
                        const percent = calculatePercent(item.used, item.limit);
                        const isUnlimited = item.limit === -1;

                        return (
                            <Card key={item.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            <item.icon className={`h-4 w-4 ${item.color.replace('bg-', 'text-')}`} />
                                            {item.label}
                                        </CardTitle>
                                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            {isUnlimited ? 'Unlimited' : (item.limit === 0 ? 'Not Included' : `${Math.round(percent)}%`)}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold text-gray-900">
                                                {item.used.toLocaleString()}
                                            </span>
                                            <span className="text-gray-500">
                                                {isUnlimited ? '∞' : `/ ${item.limit.toLocaleString()}`} {item.unit}
                                            </span>
                                        </div>
                                        {!isUnlimited && (
                                            <Progress value={percent} className="h-2" indicatorClassName={item.color} />
                                        )}
                                        {percent >= 100 && !isUnlimited && (
                                            <p className="text-xs text-red-600 mt-1 font-medium">Limit reached</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
