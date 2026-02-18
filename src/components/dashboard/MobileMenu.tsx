"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Menu,
    LayoutDashboard,
    BookOpen,
    BrainCircuit,
    Swords,
    History,
    Trophy,
    LogOut,
    Settings,
    CreditCard,
    BarChart3,
    User,
    MessageSquare
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";

export function MobileMenu() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    const menuItems = [
        { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/subjects", label: "My Courses", icon: BookOpen },
        { href: "/app/practice", label: "Practice Hub", icon: BrainCircuit },
        { href: "/app/practice/battle", label: "Battle Mode", icon: Swords },
        { href: "/app/practice/history", label: "Test History", icon: History },
        { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
    ];

    const accountItems = [
        { href: "/app/profile", label: "Account Settings", icon: Settings },
        { href: "/app/usage", label: "Usage & Limits", icon: BarChart3 },
    ];

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button className={`flex flex-col items-center p-2 rounded-lg transition-colors ${open ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Menu className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px] overflow-y-auto p-0">
                <SheetHeader>
                    <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full bg-slate-50">
                    {/* Header with User Info */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white text-center rounded-b-3xl shadow-lg">
                        <div className="relative w-20 h-20 mx-auto mb-3">
                            <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm overflow-hidden text-2xl font-bold">
                                {session?.user?.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    session?.user?.name?.charAt(0).toUpperCase() || "U"
                                )}
                            </div>
                        </div>
                        <h2 className="text-xl font-bold truncate">
                            {session?.user?.name || "User"}
                        </h2>
                        <p className="text-indigo-100 text-sm opacity-90 truncate">
                            {session?.user?.email}
                        </p>
                    </div>

                    <div className="flex-1 px-4 py-6 space-y-8">
                        {/* Main Navigation */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                                Menu
                            </h3>
                            <div className="space-y-1">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive(item.href)
                                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100"
                                            : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 mr-3 ${isActive(item.href) ? "text-indigo-600" : "text-gray-400"}`} />
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* AI Tutor Quick Access */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                                AI Tutor
                            </h3>
                            <div className="space-y-1">
                                <Link
                                    href="/app/chat"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all duration-200"
                                >
                                    <MessageSquare className="w-5 h-5 mr-3 text-gray-400" />
                                    New Chat
                                </Link>
                            </div>
                        </div>

                        {/* Account Settings */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                                Account
                            </h3>
                            <div className="space-y-1">
                                {accountItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive(item.href)
                                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100"
                                            : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                                            }`}
                                    >
                                        <item.icon className={`w-5 h-5 mr-3 ${isActive(item.href) ? "text-indigo-600" : "text-gray-400"}`} />
                                        {item.label}
                                    </Link>
                                ))}
                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
                                >
                                    <LogOut className="w-5 h-5 mr-3" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Version/Info */}
                    <div className="p-6 text-center text-xs text-gray-400 border-t border-gray-100">
                        © {new Date().getFullYear()} Zirna AI
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
