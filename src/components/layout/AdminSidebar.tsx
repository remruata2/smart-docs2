"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/generated/prisma";
import Image from "next/image";

interface AdminSidebarProps {
	setSidebarOpen?: (open: boolean) => void;
}

export default function AdminSidebar({ setSidebarOpen }: AdminSidebarProps) {
	const { data: session } = useSession();
	const pathname = usePathname();

	const baseLinkClasses =
		"flex items-center px-3 py-2 text-sm font-medium rounded-md";
	const activeLinkClasses = "bg-blue-800 text-white";
	const inactiveLinkClasses =
		"text-blue-200 hover:bg-blue-900 hover:text-white";

	return (
		// This is the actual sidebar panel content
		<div className="flex flex-col h-screen sticky top-0 w-full bg-slate-900 shadow-xl overflow-y-auto">
			{/* Title */}
			<div className="flex-shrink-0 px-4 py-4 border-b border-slate-700">
				<Link href="/admin" className="flex items-center">
					<Image
						src="/zirnalogosmallnew.png"
						alt="Zirna"
						width={100}
						height={32}
						className="h-8 w-auto brightness-0 invert"
						priority
						unoptimized
					/>
					<span className="ml-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</span>
				</Link>
			</div>
			{/* User info */}
			<div className="flex-shrink-0 flex items-center px-4 py-4 border-b border-slate-700">
				<div className="flex-shrink-0 group block">
					<div className="flex items-center">
						<div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
							{session?.user.image ? (
								<img src={session.user.image} alt="" className="h-full w-full object-cover" />
							) : (
								<span className="text-sm font-medium text-slate-200">
									{(session?.user.name || session?.user.username || "U").charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-white">
								{session?.user.name || session?.user.username || "User"}
							</p>
							<p className="text-xs font-medium text-slate-400">
								{session?.user.role}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Navigation Links */}
			<nav className="flex-1 px-2 py-4 space-y-1">
				<Link
					href="/admin"
					onClick={() => setSidebarOpen && setSidebarOpen(false)}
					className={`${baseLinkClasses} ${pathname === "/admin" ? activeLinkClasses : inactiveLinkClasses
						}`}
				>
					<svg
						className="mr-3 h-5 w-5 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
					Dashboard
				</Link>

				{session?.user.role === UserRole.admin && (
					<Link
						href="/admin/users"
						onClick={() => setSidebarOpen && setSidebarOpen(false)}
						className={`${baseLinkClasses} ${pathname.startsWith("/admin/users")
							? activeLinkClasses
							: inactiveLinkClasses
							}`}
					>
						<svg
							className="mr-3 h-5 w-5 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
						User Management
					</Link>
				)}



				{session?.user.role === UserRole.admin && (
					<div className="mt-6">
						<div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
							Content Management
						</div>
						<div className="space-y-1">
							<Link
								href="/admin/boards"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/boards")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
									/>
								</svg>
								Boards
							</Link>

							<Link
								href="/admin/institutions"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/institutions")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
									/>
								</svg>
								Institutions
							</Link>

							<Link
								href="/admin/programs"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/programs")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
									/>
								</svg>
								Programs
							</Link>

							{/* Courses Link */}
							<Link
								href="/admin/courses"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/courses")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 14l9-5-9-5-9 5 9 5z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
									/>
								</svg>
								Courses
							</Link>

							<Link
								href="/admin/subjects"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/subjects")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								Subjects
							</Link>

							<Link
								href="/admin/chapters"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/chapters")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
								Chapters
							</Link>

							<Link
								href="/admin/exams"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/exams")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								Exams
							</Link>

							<Link
								href="/admin/badges"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/badges")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
									/>
								</svg>
								Badges
							</Link>

							<Link
								href="/admin/textbook-generator"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/textbook-generator")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
									/>
								</svg>
								Textbook Generator
							</Link>

							<Link
								href="/admin/syllabus"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/syllabus")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
									/>
								</svg>
								Syllabus
							</Link>
						</div>
					</div>
				)}

				{session?.user.role === UserRole.admin && (
					<Link
						href="/admin/chat"
						onClick={() => setSidebarOpen && setSidebarOpen(false)}
						className={`${baseLinkClasses} ${pathname.startsWith("/admin/chat")
							? activeLinkClasses
							: inactiveLinkClasses
							}`}
					>
						{/* Icon for AI Chat - using a chat/message icon */}
						<svg
							className="mr-3 h-5 w-5 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
						AI Assistant
					</Link>
				)}

				{session?.user.role === UserRole.admin && (
					<div className="mt-6">
						<div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
							Settings
						</div>
						<div className="space-y-1">
							<Link
								href="/admin/settings/ai-models"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/settings/ai-models")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								{/* Icon for Models - layers */}
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4l8 4-8 4-8-4 8-4zm0 8l8 4-8 4-8-4 8-4z"
									/>
								</svg>
								AI Models
							</Link>

							<Link
								href="/admin/settings/ai-keys"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/settings/ai-keys")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								{/* Icon for API Keys - key */}
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM13.5 9.5L21 17l-2 2-1-1-2 2-2-2 2-2-2-2 1.5-1.5z"
									/>
								</svg>
								AI API Keys
							</Link>

							<Link
								href="/admin/settings/ai-config"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/settings/ai-config")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								{/* Icon for Settings - cog */}
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11.049 2.927c.3-1.14 1.99-1.14 2.29 0a1.724 1.724 0 002.573 1.066c1.003-.58 2.194.61 1.614 1.614a1.724 1.724 0 001.066 2.573c1.14.3 1.14 1.99 0 2.29a1.724 1.724 0 00-1.066 2.573c.58 1.003-.61 2.194-1.614 1.614a1.724 1.724 0 00-2.573 1.066c-.3 1.14-1.99 1.14-2.29 0a1.724 1.724 0 00-2.573-1.066c-1.003.58-2.194-.61-1.614-1.614a1.724 1.724 0 00-1.066-2.573c-1.14-.3-1.14-1.99 0-2.29.86-.226 1.53-.896 1.756-1.756.58-1.003 1.77-2.194 2.773-1.614.994.575 1.78-.211 2.356-.205z"
									/>
								</svg>
								AI Search Settings
							</Link>

							<Link
								href="/admin/settings/quiz-timers"
								onClick={() => setSidebarOpen && setSidebarOpen(false)}
								className={`${baseLinkClasses} ${pathname.startsWith("/admin/settings/quiz-timers")
									? activeLinkClasses
									: inactiveLinkClasses
									}`}
							>
								{/* Icon for Timer - clock */}
								<svg
									className="mr-3 h-5 w-5 text-gray-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Test Timers
							</Link>
						</div>
					</div>
				)}
			</nav>

			{/* Sign Out Button */}
			<div className="flex-shrink-0 px-4 py-4 border-t border-gray-700">
				<button
					onClick={() => signOut({ callbackUrl: "/login" })}
					className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					<svg
						className="mr-2 h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Sign out
				</button>
			</div>
		</div>
	);
}
