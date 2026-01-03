"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    Users,
    LogOut,
    Settings,
    ChevronLeft,
    ChevronRight,
    BrainCircuit
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface InstructorSidebarProps {
    setSidebarOpen?: (open: boolean) => void;
}

export default function InstructorSidebar({ setSidebarOpen }: InstructorSidebarProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const baseLinkClasses = "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200";
    const activeLinkClasses = "bg-indigo-700 text-white shadow-sm";
    const inactiveLinkClasses = "text-indigo-100 hover:bg-indigo-800 hover:text-white";

    const isMobile = !!setSidebarOpen;
    const displayCollapsed = isMobile ? false : isCollapsed;

    const navItems = [
        { name: "Overview", href: "/instructor/dashboard", icon: LayoutDashboard },
        { name: "My Courses", href: "/instructor/courses", icon: BookOpen },
        { name: "My Students", href: "/instructor/enrollments", icon: Users },
        { name: "Settings", href: "/instructor/settings", icon: Settings },
    ];

    return (
        <div className={`flex flex-col h-screen sticky top-0 bg-indigo-900 border-r border-indigo-800 transition-all duration-300 ${displayCollapsed ? "w-16" : "w-64"}`}>
            {!isMobile && (
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute right-0 top-8 -translate-y-1/2 translate-x-1/2 transform z-10 bg-white border border-gray-200 rounded-full h-5 w-5 flex items-center justify-center hover:bg-gray-100 text-indigo-600 shadow-md transition-colors"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            )}

            <div className="flex-shrink-0 px-4 py-4 flex items-center h-16 border-b border-indigo-800">
                {!displayCollapsed ? (
                    <Link href="/instructor/dashboard" className="flex items-center">
                        <Image
                            src="/zirnalogosmall.png"
                            alt="Zirna"
                            width={100}
                            height={32}
                            className="h-8 w-auto brightness-0 invert"
                            priority
                            unoptimized
                        />
                        <span className="ml-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">Instructor</span>
                    </Link>
                ) : (
                    <div className="w-full flex justify-center">
                        <span className="text-xl font-bold text-white italic">Z</span>
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 flex items-center px-4 py-4 border-b border-indigo-800">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold overflow-hidden">
                        {session?.user.image ? (
                            <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                            (session?.user.name || session?.user.username || "I").charAt(0).toUpperCase()
                        )}
                    </div>
                    {!displayCollapsed && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{session?.user.name || session?.user.username}</p>
                            <p className="text-xs font-medium text-indigo-300">Instructor</p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen && setSidebarOpen(false)}
                        className={`${baseLinkClasses} ${pathname === item.href ? activeLinkClasses : inactiveLinkClasses}`}
                    >
                        <item.icon className={`${displayCollapsed ? "" : "mr-3"} h-5 w-5`} />
                        {!displayCollapsed && <span>{item.name}</span>}
                    </Link>
                ))}
            </nav>

            <div className="flex-shrink-0 p-4 border-t border-indigo-800">
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className={`${baseLinkClasses} ${inactiveLinkClasses} w-full`}
                >
                    <LogOut className={`${displayCollapsed ? "" : "mr-3"} h-5 w-5 rotate-180`} />
                    {!displayCollapsed && <span>Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
