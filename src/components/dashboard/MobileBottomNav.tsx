"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BrainCircuit, User, Swords, Compass } from "lucide-react";

export function MobileBottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-safe md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Link href="/app/dashboard" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/dashboard') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <Home className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link href="/app/catalog" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/catalog') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <Compass className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Explore</span>
            </Link>

            {/* Battle Mode - Popped Out */}
            <div className="relative -top-6">
                <Link
                    href="/app/practice/battle"
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg border-4 border-gray-50 transition-transform hover:scale-105 ${isActive('/app/practice/battle')
                        ? 'bg-purple-600 text-white'
                        : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                        }`}
                >
                    <Swords className="w-6 h-6" />
                </Link>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-purple-700 whitespace-nowrap">Battle</span>
            </div>

            <Link href="/app/practice" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/practice') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <BrainCircuit className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Practice</span>
            </Link>
            <Link href="/app/subjects" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/subjects') || isActive('/app/chapters') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <BookOpen className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">My Kurs</span>
            </Link>
        </div>
    );
}
