"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BrainCircuit, User } from "lucide-react";

export function MobileBottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-safe md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Link href="/app/dashboard" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/dashboard') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <Home className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link href="/app/subjects" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/subjects') || isActive('/app/chapters') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <BookOpen className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Study</span>
            </Link>
            <Link href="/app/practice" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/practice') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <BrainCircuit className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Practice</span>
            </Link>
            <Link href="/app/profile" className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive('/app/profile') ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
                <User className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Profile</span>
            </Link>
        </div>
    );
}
