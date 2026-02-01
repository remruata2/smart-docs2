"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import UserSidebar from "@/components/layout/UserSidebar";
import { Toaster } from "@/components/ui/sonner";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { FloatingOnlineWidget } from "@/components/battle/FloatingOnlineWidget";
import { ChallengeModal } from "@/components/battle/ChallengeModal";
import { useSupabase } from "@/components/providers/supabase-provider";
import { generateQuizAction } from "@/app/app/practice/actions";
import { toast as sonnerToast } from "sonner";

import "../../styles/lexical-editor-styles.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const { sendChallenge } = useSupabase();
    const hasRedirected = useRef(false);

    // Challenge modal state
    const [challengeModalOpen, setChallengeModalOpen] = useState(false);
    const [targetUser, setTargetUser] = useState<any>(null);

    const handleOpenChallengeModal = (user: any) => {
        setTargetUser(user);
        setChallengeModalOpen(true);
    };

    const handleSendChallengeFromModal = async (
        user: any,
        subjectId: string,
        chapterId: string,
        subjectName: string,
        chapterName: string
    ) => {
        const toastId = sonnerToast.loading(`Creating battle vs ${user.username}...`);

        try {
            // Generate quiz for the battle
            const quiz = await generateQuizAction(
                parseInt(subjectId),
                parseInt(chapterId),
                "medium",
                5,
                ["MCQ"],
                false
            );

            // Create battle
            const res = await fetch("/api/battle/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quizId: quiz.id,
                    subjectId: parseInt(subjectId),
                    chapterId: parseInt(chapterId),
                    subjectName,
                    chapterName
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Send challenge invite via realtime
            await sendChallenge(user.id, user.username, data.battle.id, data.battle.code, subjectName, chapterName);

            // Redirect immediately to lobby
            sonnerToast.success(`Challenge sent to ${user.username}!`, { id: toastId });
            router.push(`/app/practice/battle/${data.battle.id}`);
        } catch (error: any) {
            console.error(error);
            sonnerToast.error(error.message || "Failed to create battle", { id: toastId });
        }
    };

    useEffect(() => {
        if (status === "loading") return;
        if (!session && !hasRedirected.current) {
            hasRedirected.current = true;
            router.push("/login");
        }
    }, [session, status]); // Removed router from dependencies

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
        <div className="min-h-screen bg-gray-50 flex relative">
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

            {/* Global Battle Widgets (Show ONLY on Battle Dashboard) */}
            {pathname === "/app/practice/battle" && (
                <FloatingOnlineWidget onChallengeUser={handleOpenChallengeModal} />
            )}
            <ChallengeModal
                targetUser={targetUser}
                isOpen={challengeModalOpen}
                onClose={() => {
                    setChallengeModalOpen(false);
                    setTargetUser(null);
                }}
                onSendChallenge={handleSendChallengeFromModal}
            />
        </div>
    );
}
