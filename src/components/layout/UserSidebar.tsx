"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
	ChevronLeft,
	ChevronRight,
	BookOpen,
	LayoutDashboard,
	LogOut,
	Settings,
	BrainCircuit,
	Trophy,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConversationList from "@/components/ConversationList";

interface UserSidebarProps {
	setSidebarOpen?: (open: boolean) => void;
}

export default function UserSidebar({ setSidebarOpen }: UserSidebarProps) {
	const { data: session } = useSession();
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);

	const baseLinkClasses =
		"flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200";
	const activeLinkClasses = "bg-gray-200 text-gray-900 shadow-sm";
	const inactiveLinkClasses =
		"text-gray-700 hover:bg-gray-100 hover:text-gray-900";

	return (
		// This is the actual sidebar panel content
		<div
			className={`flex flex-col h-screen sticky top-0 bg-gray-100 text-gray-900 border-r border-gray-200 transition-all duration-300 ease-in-out ${isCollapsed ? "w-16" : "w-64"
				}`}
		>
			{/* Collapse/Expand Toggle */}
			<button
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="absolute right-0 top-8 -translate-y-1/2 translate-x-1/2 transform z-10 bg-white border border-gray-200 rounded-full h-5 w-5 flex items-center justify-center hover:bg-gray-100 text-gray-500 hover:text-gray-700 shadow-md transition-colors"
				title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				{isCollapsed ? (
					<ChevronRight className="h-4 w-4" />
				) : (
					<ChevronLeft className="h-4 w-4" />
				)}
			</button>

			{/* Title */}
			<div className="flex-shrink-0 px-4 py-4 flex items-center justify-between h-16">
				{!isCollapsed ? (
					<h1 className="text-lg font-bold text-gray-900 tracking-tight">
						Smart Docs
					</h1>
				) : (
					<div className="w-full flex justify-center">
						<span className="text-lg font-bold text-gray-900">SD</span>
					</div>
				)}
			</div>

			{/* Navigation Links */}
			<nav className="flex-shrink-0 px-2 py-4 space-y-1">
				<Link
					href="/app/dashboard"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/dashboard")
						? activeLinkClasses
						: inactiveLinkClasses
						} ${isCollapsed ? "justify-center px-0" : ""}`}
					title={isCollapsed ? "Dashboard" : ""}
				>
					<LayoutDashboard
						className={`${isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!isCollapsed && "Dashboard"}
				</Link>

				<Link
					href="/app/subjects"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/subjects") || pathname.startsWith("/app/chapters")
						? activeLinkClasses
						: inactiveLinkClasses
						} ${isCollapsed ? "justify-center px-0" : ""}`}
					title={isCollapsed ? "Subjects" : ""}
				>
					<BookOpen
						className={`${isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!isCollapsed && "Subjects"}
				</Link>

				<Link
					href="/app/practice"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/practice")
						? activeLinkClasses
						: inactiveLinkClasses
						} ${isCollapsed ? "justify-center px-0" : ""}`}
					title={isCollapsed ? "Practice" : ""}
				>
					<BrainCircuit
						className={`${isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!isCollapsed && "Practice"}
				</Link>

				<Link
					href="/app/leaderboard"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/leaderboard")
						? activeLinkClasses
						: inactiveLinkClasses
						} ${isCollapsed ? "justify-center px-0" : ""}`}
					title={isCollapsed ? "Leaderboard" : ""}
				>
					<Trophy
						className={`${isCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!isCollapsed && "Leaderboard"}
				</Link>
			</nav>

			{/* Separator */}
			<div className="px-4 py-2">
				<div className="h-px bg-gray-200" />
			</div>

			{/* Conversation History */}
			<div className="flex-1 min-h-0 overflow-hidden flex flex-col">
				{!isCollapsed && (
					<div className="px-4 py-2 text-base font-semibold text-gray-700 tracking-wider">
						History
					</div>
				)}
				<ConversationList isCollapsed={isCollapsed} />
			</div>

			{/* User info & Sign Out */}
			<div className="flex-shrink-0 bg-transparent">
				<div className={`p-4 ${isCollapsed ? "px-2" : ""}`}>
					<div className="flex items-center mb-3">
						<div className="flex-shrink-0">
							<div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
								<span className="text-sm font-medium text-gray-900">
									{session?.user.username?.charAt(0).toUpperCase() || "U"}
								</span>
							</div>
						</div>
						{!isCollapsed && (
							<div className="ml-3 min-w-0">
								<p className="text-sm font-medium text-gray-900 truncate">
									{session?.user.username || "User"}
								</p>
								<p className="text-xs text-gray-500 truncate">User Account</p>
							</div>
						)}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								className="w-full flex items-center justify-center rounded-full p-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
								title="Settings"
							>
								<Settings className="h-4 w-4" />
								<span className="sr-only">Settings</span>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-40 bg-white border border-gray-200 text-gray-800"
						>
							<DropdownMenuItem className="text-sm hover:bg-gray-100">
								Account Settings
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => signOut({ callbackUrl: "/login" })}
								className="text-sm text-red-500 hover:bg-red-50 focus:text-red-600 focus:bg-red-50"
							>
								<LogOut className="mr-2 h-4 w-4" />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
