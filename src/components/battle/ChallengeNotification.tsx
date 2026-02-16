"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ChallengeNotification({ currentUserId }: { currentUserId: number }) {
    const { supabase } = useSupabase();
    const router = useRouter();

    useEffect(() => {
        if (!supabase || !currentUserId) return;

        const channel = supabase.channel(`notifications:user:${currentUserId}`)
            .on('broadcast', { event: 'CHALLENGE_INVITE' }, (payload: any) => {
                console.log('[CHALLENGE] Received invite:', payload);
                const { senderId, senderName, battleId, quizId, battleCode } = payload.payload;

                toast.custom((t) => (
                    <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-4 shadow-2xl flex flex-col gap-3 w-80">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shrink-0">
                                {senderName?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-white">Battle Challenge!</h4>
                                <p className="text-sm text-slate-300">
                                    <span className="text-indigo-400 font-semibold">{senderName}</span> wants to battle you.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-1">
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300"
                                onClick={() => toast.dismiss(t)}
                            >
                                Decline
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
                                onClick={() => handleAccept(battleId, battleCode, t)}
                            >
                                Accept
                            </Button>
                        </div>
                    </div>
                ), { duration: 15000 });
            })
            .on('broadcast', { event: 'CHALLENGE_ACCEPTED' }, (payload: any) => {
                // This event is for the SENDER to know their invite was accepted
                console.log('[CHALLENGE] Your invite was accepted:', payload);
                const { battleId } = payload.payload;
                toast.success("Challenge Accepted! Redirecting...");
                router.push(`/app/practice/battle/${battleId}`);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, currentUserId, router]);

    const handleAccept = async (battleId: string, battleCode: string, toastId: string | number) => {
        toast.dismiss(toastId);
        const loadingToast = toast.loading("Joining battle...");
        console.log('[CHALLENGE_NOTIF] Accepting challenge:', { battleId, battleCode });

        try {
            // Join the battle using the code
            console.log('[CHALLENGE_NOTIF] Sending join request...');
            const res = await fetch("/api/battle/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: battleCode }),
            });
            console.log('[CHALLENGE_NOTIF] Join response status:', res.status);

            if (!res.ok) {
                const data = await res.json();
                console.error('[CHALLENGE_NOTIF] Join failed:', data);
                throw new Error(data.error || "Failed to join battle");
            }

            console.log('[CHALLENGE_NOTIF] Join success, redirecting to:', `/app/practice/battle/${battleId}`);
            toast.success("Joined! Redirecting...", { id: loadingToast });
            router.push(`/app/practice/battle/${battleId}`);
        } catch (e: any) {
            console.error("Error accepting challenge", e);
            toast.error(e.message || "Failed to join battle", { id: loadingToast });
        }
    };

    return null; // Headless component
}
