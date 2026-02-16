"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BookOpen, User } from "lucide-react";
import Image from "next/image";

export function BrowseHeader() {
    const { data: session } = useSession();

    return (
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="flex flex-col items-center group">
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
                    <Link href="/features" className="text-gray-600 hover:text-gray-900 font-medium">
                        Features
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
                        <>
                            <Link href="/my-courses">
                                <Button variant="ghost" size="sm" className="hidden md:flex">
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
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost">Sign In</Button>
                            </Link>
                            <Link href="/login">
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    Get Started
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
