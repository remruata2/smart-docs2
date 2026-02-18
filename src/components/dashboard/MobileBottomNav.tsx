"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BrainCircuit, Sparkles, Compass } from "lucide-react";
import { MobileMenu } from "./MobileMenu";

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

            {/* Practice Hub - Center Popped Out */}
            <div className="relative -top-6">
                <Link
                    href="/app/practice"
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg border-4 border-gray-50 transition-transform hover:scale-105 ${isActive('/app/practice')
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary text-primary-foreground'
                        }`}
                >
                    <BrainCircuit className="w-6 h-6" />
                </Link>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap">Practice</span>
            </div>

            <Link href="/app/chat" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/chat') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <Sparkles className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">AI Tutor</span>
            </Link>
            {/* Replaced 'My Courses' with MobileMenu */}
            <MobileMenu />
        </div>
    );
}
