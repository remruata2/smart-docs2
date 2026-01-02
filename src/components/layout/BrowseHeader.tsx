"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { BrainCircuit, BookOpen, User } from "lucide-react";
import Image from "next/image";

export function BrowseHeader() {
    const { data: session } = useSession();

    return (
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <BrainCircuit className="h-8 w-8 text-indigo-600" />
                    <span className="text-xl font-bold text-gray-900">Zirna</span>
                </Link>

                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
                        Browse Courses
                    </Link>
                    <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium">
                        About
                    </Link>
                    <Link href="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">
                        Pricing
                    </Link>
                    {session && (
                        <Link href="/my-learning" className="text-gray-600 hover:text-gray-900 font-medium">
                            My Learning
                        </Link>
                    )}
                </nav>

                <div className="flex items-center gap-3">
                    {session ? (
                        <>
                            <Link href="/my-learning">
                                <Button variant="ghost" size="sm" className="hidden md:flex">
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    My Learning
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
