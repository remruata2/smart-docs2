"use client";

import { useEffect, useState } from "react";
import { Session } from "next-auth";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Users,
	UserCheck,
	BookOpen,
	GraduationCap,
	MessageSquare,
	Zap,
	Trophy,
	CreditCard,
	TrendingUp,
	ArrowUpRight,
	Calendar,
	History,
	ExternalLink,
} from "lucide-react";
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
	kpis: {
		totalUsers: number;
		newUsers7d: number;
		paidEnrollments: number;
		trialEnrollments: number;
		totalEnrollments: number;
		quizzesCompleted: number;
		battlesPlayed: number;
		aiConversations: number;
		revenue30d: number;
	};
	charts: {
		userGrowth: any[];
		revenueTrend: any[];
		enrollmentTrend: any[];
		activityTrend: any[];
	};
	recent: {
		users: any[];
		enrollments: any[];
	};
}

export default function AdminDashboard({ session }: { session: Session }) {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchStats() {
			try {
				const response = await fetch("/api/admin/dashboard");
				if (!response.ok) throw new Error("Failed to fetch dashboard data");
				const result = await response.json();
				setData(result);
			} catch (error) {
				console.error("Dashboard fetch error:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchStats();
	}, []);

	if (loading) {
		return (
			<div className="p-8 space-y-8 animate-pulse">
				<div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					{[...Array(8)].map((_, i) => (
						<div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
					))}
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
					<div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
				</div>
			</div>
		);
	}

	if (!data) return <div className="p-8 text-center">Failed to load dashboard data</div>;

	const kpiItems = [
		{ label: "Total Users", value: data.kpis.totalUsers, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
		{ label: "New Users (7d)", value: data.kpis.newUsers7d, icon: UserCheck, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
		{ label: "Paid Enrollments", value: data.kpis.paidEnrollments, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
		{ label: "Active Trials", value: data.kpis.trialEnrollments, icon: History, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
		{ label: "Revenue (30d)", value: `₹${Math.round(data.kpis.revenue30d).toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
		{ label: "Enrollments", value: data.kpis.totalEnrollments, icon: GraduationCap, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
		{ label: "Quizzes", value: data.kpis.quizzesCompleted, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
		{ label: "Battles", value: data.kpis.battlesPlayed, icon: Trophy, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
		{ label: "AI Chats", value: data.kpis.aiConversations, icon: MessageSquare, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
	];

	return (
		<div className="p-4 sm:p-8 space-y-8 bg-gray-50/50 dark:bg-gray-950/50 min-h-screen">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Analytics</h1>
					<p className="text-muted-foreground mt-1">
						Comprehensive overview of system performance and user activity.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="px-3 py-1">
						<Calendar className="w-3.5 h-3.5 mr-1.5" />
						Last 30 Days
					</Badge>
				</div>
			</div>

			{/* KPI Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
				{kpiItems.map((item, i) => (
					<Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all duration-200">
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<div className={`p-2.5 rounded-xl ${item.bg} group-hover:scale-110 transition-transform duration-200`}>
								<item.icon className={`h-5 w-5 ${item.color}`} />
							</div>
							<div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
								<ArrowUpRight className="w-3 h-3 mr-1" />
								Active
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
							<p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
								{item.label}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Charts Grid - Row 1 */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="border-none shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">User Growth</CardTitle>
						<CardDescription>Daily new user registrations</CardDescription>
					</CardHeader>
					<CardContent className="h-80">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={data.charts.userGrowth}>
								<defs>
									<linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
								<XAxis
									dataKey="date"
									tickFormatter={(date) => format(new Date(date), 'MMM d')}
									axisLine={false}
									tickLine={false}
									fontSize={12}
									tick={{ fill: '#6b7280' }}
								/>
								<YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#6b7280' }} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
									labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
								/>
								<Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
							</AreaChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">Revenue Trend</CardTitle>
						<CardDescription>Estimated revenue from subscriptions</CardDescription>
					</CardHeader>
					<CardContent className="h-80">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.charts.revenueTrend}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
								<XAxis
									dataKey="date"
									tickFormatter={(date) => format(new Date(date), 'MMM d')}
									axisLine={false}
									tickLine={false}
									fontSize={12}
									tick={{ fill: '#6b7280' }}
								/>
								<YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#6b7280' }} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
									formatter={(value) => [`₹${value}`, 'Revenue']}
									labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
								/>
								<Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>

			{/* Charts Grid - Row 2 */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="border-none shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">Activity Trend</CardTitle>
						<CardDescription>Quizzes vs Battles activity</CardDescription>
					</CardHeader>
					<CardContent className="h-80">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.charts.activityTrend}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
								<XAxis
									dataKey="date"
									tickFormatter={(date) => format(new Date(date), 'MMM d')}
									axisLine={false}
									tickLine={false}
									fontSize={12}
									tick={{ fill: '#6b7280' }}
								/>
								<YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#6b7280' }} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
									labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
								/>
								<Legend iconType="circle" />
								<Bar dataKey="quizzes" name="Quizzes" fill="#6366f1" radius={[4, 4, 0, 0]} />
								<Bar dataKey="battles" name="Battles" fill="#f59e0b" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm">
					<CardHeader>
						<CardTitle className="text-lg">Enrollment Trend</CardTitle>
						<CardDescription>Daily course enrollments</CardDescription>
					</CardHeader>
					<CardContent className="h-80">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={data.charts.enrollmentTrend}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
								<XAxis
									dataKey="date"
									tickFormatter={(date) => format(new Date(date), 'MMM d')}
									axisLine={false}
									tickLine={false}
									fontSize={12}
									tick={{ fill: '#6b7280' }}
								/>
								<YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#6b7280' }} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
									labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
								/>
								<Line type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
							</LineChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>

			{/* Tables Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
				<Card className="border-none shadow-sm overflow-hidden">
					<CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
						<div>
							<CardTitle className="text-lg flex items-center gap-2">
								<Users className="w-5 h-5 text-blue-600" />
								Recent Signups
							</CardTitle>
						</div>
						<Link href="/admin/users" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
							View all
							<ExternalLink className="w-3.5 h-3.5" />
						</Link>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-6">User</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Joined</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.recent.users.map((user) => (
									<TableRow key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
										<TableCell className="pl-6">
											<div className="flex flex-col">
												<span className="font-medium text-gray-900 dark:text-gray-100">{user.username}</span>
												<span className="text-xs text-muted-foreground">{user.email || 'No email'}</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-[10px] px-1.5 py-0">
												{user.role}
											</Badge>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground whitespace-nowrap">
											{format(new Date(user.created_at), 'MMM d, h:mm a')}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm overflow-hidden">
					<CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
						<div>
							<CardTitle className="text-lg flex items-center gap-2">
								<Zap className="w-5 h-5 text-yellow-600" />
								Recent Enrollments
							</CardTitle>
						</div>
						<Link href="/admin/enrollments" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
							View all
							<ExternalLink className="w-3.5 h-3.5" />
						</Link>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="pl-6">Student</TableHead>
									<TableHead>Course</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.recent.enrollments.map((env) => (
									<TableRow key={env.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
										<TableCell className="pl-6">
											<span className="font-medium text-gray-900 dark:text-gray-100">{env.user.username || env.user.name}</span>
										</TableCell>
										<TableCell className="max-w-[150px] truncate">
											<span className="text-sm">{env.course.title}</span>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground whitespace-nowrap">
											{format(new Date(env.enrolled_at), 'MMM d, h:mm a')}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}