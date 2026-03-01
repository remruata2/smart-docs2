"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Menu, PlaySquare, Compass, MessageSquare, LayoutDashboard, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import Image from "next/image";

export function BrowseHeader() {
    const { data: session } = useSession();

    return (
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="flex flex-col items-start group">
                    <Image
                        src="/zirna-brand-logo.png"
                        alt="Zirna"
                        width={120}
                        height={40}
                        className="h-8 md:h-10 w-auto object-contain"
                        priority
                        unoptimized
                    />
                    <span className="text-[10px] md:text-xs font-medium italic text-black leading-tight tracking-tight mt-1 whitespace-nowrap transition-opacity">
                        "Bridging Knowledge Gaps with Innovation"
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/courses" className="text-gray-600 hover:text-gray-900 font-medium">
                        Browse Courses
                    </Link>
                    <Link href="/tutorial-videos" className="text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap">
                        Tutorial Videos
                    </Link>
                    <Link href="/features" className="text-gray-600 hover:text-gray-900 font-medium">
                        Features
                    </Link>
                    <Link href="/forum" className="text-gray-600 hover:text-gray-900 font-medium">
                        Forum
                    </Link>
                    {session && (
                        <>
                            <Link href="/my-courses" className="text-gray-600 hover:text-gray-900 font-medium">
                                My Courses
                            </Link>
                        </>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    {session ? (
                        <div className="hidden md:flex items-center gap-3">
                            <Link href="/my-courses">
                                <Button variant="ghost" size="sm">
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    My Courses
                                </Button>
                            </Link>
                            <Link href="/app/profile">
                                <Button variant="outline" size="sm">
                                    <User className="h-4 w-4 mr-2" />
                                    {session.user?.username || "Profile"}
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost">Sign In</Button>
                            </Link>
                            <Link href="/login">
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Navigation Toggle */}
                    <div className="md:hidden ml-2 flex items-center">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Toggle mobile menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[85vw] max-w-[400px] sm:w-[350px] p-0 flex flex-col bg-white">
                                <div className="p-6 pb-4 border-b">
                                    <SheetTitle className="text-xl font-bold text-indigo-950 flex items-center gap-2">
                                        <Image
                                            src="/zirna-brand-logo.png"
                                            alt="Zirna"
                                            width={100}
                                            height={32}
                                            className="h-7 w-auto object-contain"
                                            priority
                                            unoptimized
                                        />
                                    </SheetTitle>
                                    <SheetDescription className="mt-2 text-sm">
                                        Bridging Knowledge Gaps with Innovation
                                    </SheetDescription>
                                </div>

                                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                                    <nav className="flex flex-col gap-2">
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">Explore</div>
                                        <Link href="/courses" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                            <Compass className="w-5 h-5" />
                                            Browse Courses
                                        </Link>
                                        <Link href="/tutorial-videos" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                            <PlaySquare className="w-5 h-5" />
                                            Tutorial Videos
                                        </Link>
                                        <Link href="/features" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                            <BookOpen className="w-5 h-5" />
                                            Features
                                        </Link>
                                        <Link href="/forum" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                            <MessageSquare className="w-5 h-5" />
                                            Community Forum
                                        </Link>
                                    </nav>

                                    {session ? (
                                        <div className="mt-8">
                                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">My Account</div>
                                            <div className="flex flex-col gap-2">
                                                <Link href="/app/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                                    <LayoutDashboard className="w-5 h-5" />
                                                    My Dashboard
                                                </Link>
                                                <Link href="/my-courses" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                                    <BookOpen className="w-5 h-5" />
                                                    My Courses
                                                </Link>
                                                <Link href="/app/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                                    <User className="w-5 h-5" />
                                                    Profile Settings
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-8 flex flex-col gap-3">
                                            <Link href="/login" className="w-full">
                                                <Button variant="outline" className="w-full justify-center h-12 text-base font-medium">
                                                    Sign In
                                                </Button>
                                            </Link>
                                            <Link href="/login" className="w-full">
                                                <Button className="w-full justify-center h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-medium">
                                                    Get Started
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {session && (
                                    <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3 truncate">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold">
                                                {(session.user?.name || session.user?.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{session.user?.name || session.user?.username}</p>
                                                <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => signOut({ callbackUrl: '/' })}
                                            className="ml-auto p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Sign Out"
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
