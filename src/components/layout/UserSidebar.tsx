"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface UserSidebarProps {
    setSidebarOpen?: (open: boolean) => void;
}

export default function UserSidebar({ setSidebarOpen }: UserSidebarProps) {
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
                <h1 className="text-lg font-semibold text-white">Smart Docs</h1>
            </div>
            {/* User info */}
            <div className="flex-shrink-0 flex items-center px-4 py-4 border-b border-slate-700">
                <div className="flex-shrink-0 group block">
                    <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-200">
                                {session?.user.username?.charAt(0).toUpperCase() || "U"}
                            </span>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">
                                {session?.user.username || "User"}
                            </p>
                            <p className="text-xs font-medium text-slate-400">
                                User Account
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-2 py-4 space-y-1">
                <Link
                    href="/app"
                    onClick={() => setSidebarOpen && setSidebarOpen(false)}
                    className={`${baseLinkClasses} ${pathname === "/app" ? activeLinkClasses : inactiveLinkClasses
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

                <Link
                    href="/app/categories"
                    onClick={() => setSidebarOpen && setSidebarOpen(false)}
                    className={`${baseLinkClasses} ${pathname.startsWith("/app/categories")
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
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                    </svg>
                    Categories
                </Link>

                <Link
                    href="/app/files"
                    onClick={() => setSidebarOpen && setSidebarOpen(false)}
                    className={`${baseLinkClasses} ${pathname.startsWith("/app/files")
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    My Files
                </Link>

                <Link
                    href="/app/chat"
                    onClick={() => setSidebarOpen && setSidebarOpen(false)}
                    className={`${baseLinkClasses} ${pathname.startsWith("/app/chat")
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
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    AI Chat
                </Link>
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
