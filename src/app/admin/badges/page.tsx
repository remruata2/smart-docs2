import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteBadge } from "./actions";
import { BadgeIcon } from "@/components/ui/badge-icon";

export default async function AdminBadgesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
    const params = await searchParams;
    const badges = await prisma.streakBadge.findMany({
        orderBy: { min_streak: 'asc' },
        include: {
            _count: {
                select: { user_badges: true }
            }
        }
    });

    const recentEarners = await prisma.userBadge.findMany({
        take: 20,
        orderBy: { earned_at: 'desc' },
        include: {
            user: { select: { username: true, email: true } },
            badge: true
        }
    });

    return (
        <div className="space-y-8">
            {/* Badges Configuration Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Streak Badges</h1>
                    <Link href="/admin/badges/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Badge
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {badges.map((badge) => (
                        <Card key={badge.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {badge.name}
                                </CardTitle>
                                <BadgeIcon name={badge.icon} className="w-8 h-8 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {badge.min_streak} Days
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {badge._count.user_badges} earners
                                </p>
                                <div className="flex items-center gap-2 mt-4">
                                    <form action={deleteBadge.bind(null, badge.id)}>
                                        <Button variant="destructive" size="sm" type="submit" className="w-full">
                                            <Trash2 className="w-3 h-3 mr-2" />
                                            Delete
                                        </Button>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {badges.length === 0 && (
                        <div className="col-span-full text-center py-8 bg-white rounded-lg border border-dashed">
                            <p className="text-gray-500">No badges configured.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Earners List Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Earners</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Badge</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentEarners.map((earner) => (
                                <tr key={earner.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{earner.user.username}</div>
                                        <div className="text-sm text-gray-500">{earner.user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 gap-1">
                                            <BadgeIcon name={earner.badge.icon} className="w-4 h-4" />
                                            {earner.badge.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(earner.earned_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {recentEarners.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No badges earned yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
