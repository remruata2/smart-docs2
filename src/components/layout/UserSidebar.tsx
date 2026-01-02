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
	History,
	Swords,
	Compass,
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

	// Hide collapse toggle on mobile (when setSidebarOpen is provided, it means we're in mobile mode)
	const isMobile = !!setSidebarOpen;
	// On mobile, always show expanded sidebar (collapse doesn't make sense for off-canvas)
	const displayCollapsed = isMobile ? false : isCollapsed;

	return (
		// This is the actual sidebar panel content
		<div
			className={`flex flex-col h-screen sticky top-0 bg-gradient-to-b from-indigo-800 to-indigo-950 text-white border-r border-white/10 transition-all duration-300 ease-in-out ${displayCollapsed ? "w-16" : "w-64"
				}`}
		>
			{/* Collapse/Expand Toggle - Hidden on mobile */}
			{!isMobile && (
				<button
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="absolute right-0 top-8 -translate-y-1/2 translate-x-1/2 transform z-10 bg-white border border-gray-200 rounded-full h-5 w-5 flex items-center justify-center hover:bg-gray-100 text-violet-600 shadow-md transition-colors"
					title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{isCollapsed ? (
						<ChevronRight className="h-4 w-4" />
					) : (
						<ChevronLeft className="h-4 w-4" />
					)}
				</button>
			)}

			{/* Title */}
			<div className="flex-shrink-0 px-4 py-4 flex items-center justify-between h-16">
				{!displayCollapsed ? (
					<h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
						<BrainCircuit className="w-6 h-6" />
						Zirna
					</h1>
				) : (
					<div className="w-full flex justify-center">
						<span className="text-lg font-bold text-white">SD</span>
					</div>
				)}
			</div>

			{/* Navigation Links */}
			<nav className="flex-shrink-0 px-2 py-4 space-y-1">
				<Link
					href="/app/dashboard"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/dashboard")
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Dashboard" : ""}
				>
					<LayoutDashboard
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Dashboard"}
				</Link>

				<Link
					href="/app/subjects"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/subjects") ||
						pathname.startsWith("/app/chapters")
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Subjects" : ""}
				>
					<BookOpen
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Subjects"}
				</Link>

				<Link
					href="/app/catalog"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/catalog")
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Explore Catalog" : ""}
				>
					<Compass
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Explore Catalog"}
				</Link>

				<Link
					href="/app/practice"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname === "/app/practice"
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Practice" : ""}
				>
					<BrainCircuit
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Practice"}
				</Link>

				<Link
					href="/app/practice/battle"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/practice/battle")
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Battle Mode" : ""}
				>
					<Swords
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Battle Mode"}
				</Link>

				<Link
					href="/app/practice/history"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/practice/history")
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Quiz History" : ""}
				>
					<History
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Quiz History"}
				</Link>

				<Link
					href="/app/leaderboard"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname.startsWith("/app/leaderboard")
						? "bg-white/20 text-white shadow-sm"
						: "text-white/70 hover:bg-white/10 hover:text-white"
						} ${displayCollapsed ? "justify-center px-0" : ""}`}
					title={displayCollapsed ? "Leaderboard" : ""}
				>
					<Trophy
						className={`${displayCollapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`}
					/>
					{!displayCollapsed && "Leaderboard"}
				</Link>
			</nav>

			{/* Separator */}
			<div className="px-4 py-2">
				<div className="h-px bg-white/20" />
			</div>

			{/* Conversation History */}
			<div className="flex-1 min-h-0 overflow-hidden flex flex-col">
				{!displayCollapsed && (
					<div className="px-4 py-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
						History
					</div>
				)}
				<ConversationList isCollapsed={displayCollapsed} />
			</div>

			{/* User info & Sign Out */}
			<div className="flex-shrink-0 bg-transparent">
				<div className={`p-4 ${displayCollapsed ? "px-2" : ""}`}>
					<div className="flex items-center mb-3">
						<div className="flex-shrink-0">
							<div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
								<span className="text-sm font-medium text-white">
									{session?.user.username?.charAt(0).toUpperCase() || "U"}
								</span>
							</div>
						</div>
						{!displayCollapsed && (
							<div className="ml-3 min-w-0">
								<p className="text-sm font-medium text-white truncate">
									{session?.user.username || "User"}
								</p>
								<p className="text-xs text-white/60 truncate">User Account</p>
							</div>
						)}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								className="w-full flex items-center justify-center rounded-full p-3 bg-white/10 border border-white/10 text-white hover:bg-white/20 transition backdrop-blur-sm"
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
							<DropdownMenuItem asChild>
								<Link href="/app/profile" className="w-full cursor-pointer text-sm hover:bg-gray-100">
									Account Settings
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href="/app/usage" className="w-full cursor-pointer text-sm hover:bg-gray-100">
									Usage & Limits
								</Link>
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
		</div >
	);
}
