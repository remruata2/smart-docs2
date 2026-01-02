"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import InstructorSidebar from "@/components/layout/InstructorSidebar";
import { Toaster } from "@/components/ui/sonner";

export default function InstructorLayoutClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const hasRedirected = useRef(false);

    useEffect(() => {
        if (status === "loading") return;

        if (!session && !hasRedirected.current) {
            hasRedirected.current = true;
            router.push("/login");
            return;
        }

        if (session && session.user.role !== "instructor" && session.user.role !== "admin" && !hasRedirected.current) {
            hasRedirected.current = true;
            router.push("/");
            return;
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-indigo-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!session || (session.user.role !== "instructor" && session.user.role !== "admin")) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Toaster richColors position="top-right" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
                <InstructorSidebar />
            </div>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-gray-600 bg-opacity-75"
                        onClick={() => setSidebarOpen(false)}
                    ></div>
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-900 border-r border-indigo-800">
                        <div className="absolute top-0 right-0 -mr-12 pt-2">
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white"
                            >
                                <span className="sr-only">Close sidebar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <InstructorSidebar setSidebarOpen={setSidebarOpen} />
                    </div>
                </div>
            )}

            <div className="flex flex-col w-0 flex-1 overflow-hidden">
                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 flex-shrink-0 flex h-16 bg-white shadow-sm border-b">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                    >
                        <span className="sr-only">Open sidebar</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex-1 px-4 flex items-center justify-between">
                        <span className="text-lg font-semibold text-indigo-900">Instructor Site</span>
                    </div>
                </div>

                <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
