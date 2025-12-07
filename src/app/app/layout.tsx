"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import UserSidebar from "@/components/layout/UserSidebar";
import { Toaster } from "@/components/ui/sonner";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";

import "../../styles/lexical-editor-styles.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (!session) {
            router.push("/login");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Toaster richColors position="top-right" />

            {/* Static sidebar for desktop */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <UserSidebar />
            </div>

            {/* Main content area */}
            <div className="flex flex-col w-0 flex-1 overflow-hidden">

                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none pb-16 lg:pb-0">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
