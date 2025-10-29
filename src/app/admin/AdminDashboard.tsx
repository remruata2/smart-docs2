"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, FolderOpen, Activity, Shield, UserCheck } from "lucide-react";

interface DashboardStats {
	categoriesCount: number;
	filesCount: number;
	usersCount: number;
	activeUsersCount: number;
}

interface AdminDashboardProps {
	session: any;
	stats: DashboardStats;
}

export default function AdminDashboard({ session, stats }: AdminDashboardProps) {
	return (
		<div className="px-6 py-6 sm:px-32">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
				<p className="mt-1 text-sm text-gray-600">
					Welcome back, {session?.user?.name || session?.user?.username}! Here's an overview of your system.
				</p>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Files</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.filesCount.toLocaleString()}</div>
						<p className="text-xs text-muted-foreground">
							Documents uploaded
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Categories</CardTitle>
						<FolderOpen className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.categoriesCount.toLocaleString()}</div>
						<p className="text-xs text-muted-foreground">
							Document categories
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.usersCount.toLocaleString()}</div>
						<p className="text-xs text-muted-foreground">
							Registered users
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Users</CardTitle>
						<UserCheck className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeUsersCount.toLocaleString()}</div>
						<p className="text-xs text-muted-foreground">
							Currently active
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
				<Link href="/admin/files">
					<Card className="hover:shadow-md transition-shadow cursor-pointer">
						<CardHeader>
							<div className="flex items-center space-x-2">
								<FileText className="h-5 w-5 text-blue-600" />
								<CardTitle className="text-lg">Manage Files</CardTitle>
							</div>
							<CardDescription>
								Upload, edit, and organize documents
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-gray-600">
								Add new files, update existing documents, and manage the file library.
							</p>
						</CardContent>
					</Card>
				</Link>

				<Link href="/admin/categories">
					<Card className="hover:shadow-md transition-shadow cursor-pointer">
						<CardHeader>
							<div className="flex items-center space-x-2">
								<FolderOpen className="h-5 w-5 text-green-600" />
								<CardTitle className="text-lg">Categories</CardTitle>
							</div>
							<CardDescription>
								Organize documents by category
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-gray-600">
								Create and manage document categories for better organization.
							</p>
						</CardContent>
					</Card>
				</Link>

				{session?.user.role === "admin" && (
					<Link href="/admin/users">
						<Card className="hover:shadow-md transition-shadow cursor-pointer">
							<CardHeader>
								<div className="flex items-center space-x-2">
									<Shield className="h-5 w-5 text-purple-600" />
									<CardTitle className="text-lg">User Management</CardTitle>
								</div>
								<CardDescription>
									Manage system users and permissions
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-gray-600">
									Add, edit, and manage user accounts and their access levels.
								</p>
							</CardContent>
						</Card>
					</Link>
				)}

				{session?.user.role === "admin" && (
					<Link href="/admin/chat">
						<Card className="hover:shadow-md transition-shadow cursor-pointer">
							<CardHeader>
								<div className="flex items-center space-x-2">
									<Activity className="h-5 w-5 text-orange-600" />
									<CardTitle className="text-lg">AI Assistant</CardTitle>
								</div>
								<CardDescription>
									Interact with AI for document analysis
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-gray-600">
									Use AI to analyze documents, answer questions, and generate insights.
								</p>
							</CardContent>
						</Card>
					</Link>
				)}
			</div>
		</div>
	);
}