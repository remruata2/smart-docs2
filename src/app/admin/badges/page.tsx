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

                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {badges.map((badge) => (
                            <li key={badge.id}>
                                <div className="px-4 py-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 mr-3">
                                                <BadgeIcon name={badge.icon} className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <span className="text-base font-bold text-gray-900 truncate">
                                                {badge.name}
                                            </span>
                                            <span className="ml-3 px-2.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wider">
                                                {badge.min_streak} Day Streak
                                            </span>
                                        </div>
                                        <div className="ml-2 flex-shrink-0">
                                            <form action={deleteBadge.bind(null, badge.id)}>
                                                <Button variant="outline" size="sm" type="submit" className="h-8 border-red-200 text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </Button>
                                            </form>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm text-sm">
                                                <span className="font-bold mr-1.5">Total Earners:</span>
                                                <span className="tabular-nums font-medium">{badge._count.user_badges}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {badges.length === 0 && (
                            <li className="px-4 py-8 text-center text-gray-500">
                                No badges configured.
                            </li>
                        )}
                    </ul>
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
