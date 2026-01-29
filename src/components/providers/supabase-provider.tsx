"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


type UserStatus = 'ONLINE' | 'IN_LOBBY' | 'IN_GAME' | 'OFFLINE';

type SupabaseContextType = {
    supabase: any;
    onlineUsers: any[];
    userStatus: UserStatus;
    updatePresenceStatus: (status: UserStatus) => Promise<void>;
    joinCourseRoom: (courseId: string) => void;
    leaveCourseRoom: () => void;
    sendChallenge: (
        targetUserId: number,
        targetUsername: string,
        battleId: string,
        battleCode: string,
        subjectName: string,
        chapterName: string
    ) => Promise<void>;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [supabase] = useState(() =>
        createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    );
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [userStatus, setUserStatus] = useState<UserStatus>('ONLINE');

    // Track personal notifications and listen for challenge invites
    useEffect(() => {
        if (!session?.user?.id || !supabase) return;

        const userId = session.user.id;
        const channel = supabase.channel(`notifications:user:${userId}`)
            .on('broadcast', { event: 'CHALLENGE_INVITE' }, (payload: any) => {
                const { senderName, battleId, battleCode, subjectName, chapterName, timestamp
                } = payload.payload || {};

                if (senderName && battleId && battleCode) {
                    // Use timestamp or random ID to force new toast
                    const toastId = `challenge-${battleId}-${timestamp || Date.now()}`;

                    const handleAccept = async () => {
                        toast.dismiss(toastId);
                        const loadingToast = toast.loading("Joining battle...");

                        try {
                            // Call join API first
                            const res = await fetch("/api/battle/join", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ code: battleCode })
                            });

                            if (!res.ok) {
                                const data = await res.json();
                                throw new Error(data.error || "Failed to join");
                            }

                            // Broadcast CHALLENGE_ACCEPTED to notify host
                            if (supabase) {
                                const acceptChannel = supabase.channel(`battle:${battleId}`);
                                await new Promise<void>((resolve) => {
                                    acceptChannel.subscribe((status) => {
                                        if (status === 'SUBSCRIBED') resolve();
                                    });
                                });
                                await acceptChannel.send({
                                    type: 'broadcast',
                                    event: 'CHALLENGE_ACCEPTED',
                                    payload: {
                                        acceptedBy: session?.user?.name || 'Someone',
                                        acceptedById: session?.user?.id
                                    }
                                });
                                await supabase.removeChannel(acceptChannel);
                            }

                            toast.dismiss(loadingToast);
                            toast.success("Joined battle!");
                            // Update status to IN_LOBBY before redirecting
                            setUserStatus('IN_LOBBY');
                            window.location.href = `/app/practice/battle/${battleId}`;
                        } catch (error: any) {
                            toast.dismiss(loadingToast);
                            toast.error(error.message || "Failed to join battle");
                        }
                    };

                    toast.custom(
                        (t) => (
                            <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-4 shadow-2xl max-w-sm animate-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <span className="text-2xl">⚔️</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">
                                            {senderName} challenged you!
                                        </p>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {subjectName} • {chapterName}
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={handleAccept}
                                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-emerald-400 hover:to-green-500 transition-all"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    toast.dismiss(toastId);
                                                    // Broadcast decline to battle channel so host is notified
                                                    if (supabase) {
                                                        const declineChannel = supabase.channel(`battle:${battleId}`);
                                                        await new Promise<void>((resolve) => {
                                                            declineChannel.subscribe((status) => {
                                                                if (status === 'SUBSCRIBED') resolve();
                                                            });
                                                        });
                                                        await declineChannel.send({
                                                            type: 'broadcast',
                                                            event: 'CHALLENGE_DECLINED',
                                                            payload: {
                                                                declinedBy: session?.user?.name || 'Someone'
                                                            }
                                                        });
                                                        await supabase.removeChannel(declineChannel);
                                                    }
                                                    toast.info("Challenge declined");
                                                }}
                                                className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600 transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ),
                        {
                            duration: Infinity, // Persistent until user acts
                            id: toastId
                        }
                    );
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session, supabase, router]);

    // Track Course Presence (Legacy/Specific Room)
    useEffect(() => {
        if (!session?.user?.id || !supabase || !activeCourseId) return;
        // ... (keep existing course room logic if needed, or replace? 
        // The user said "Online list should show all users... inside the app... limited to enrolled same courses".
        // This implies a GLOBAL list. The existing 'activeCourseId' logic is for "Course Rooms". 
        // We generally want both. Keep Course Room logic as is for now to break nothing.
        // We will ADD Global Presence tracking below.
    }, [session, supabase, activeCourseId, userStatus]);

    // NEW: Global Presence Tracking for Battle/General Visibility
    useEffect(() => {
        if (!session?.user?.id || !supabase) return;

        const userId = parseInt(session.user.id);
        const username = session.user.name || "Unknown";
        const userImage = session.user.image;

        // Fetch Enrollments for filtering
        let myCourseIds: number[] = [];
        const fetchEnrollments = async () => {
            try {
                // We need an endpoint or server action. Assuming /api/enrollments or similar exists.
                // Or we can just use a simple fetch if we differ from mobile. 
                // Let's assume we can get it or simpler: pass it as prop? No.
                // For now, let's fetch from the API endpoint we know exists: /api/mobile/enrollments 
                // (it works for web too if session cookie is shared, which it usually is in this architecture, 
                // OR we accept we might need a web-specific endpoint).
                // Actually, let's try to fetch from `/api/courses/enrolled` if it exists, or just `/api/enrollments`.
                // Checking previous logs... `apiClient.getMyEnrollments` hits `/api/mobile/enrollments`.
                // We'll try hitting `/api/mobile/enrollments` from web client.
                const res = await fetch('/api/mobile/enrollments');
                if (res.ok) {
                    const data = await res.json();
                    const rawEnrollments = data.enrollments || data.courses || [];
                    myCourseIds = rawEnrollments.map((e: any) => e.course_id || e.course?.id || e.id);
                    console.log('[PRESENCE-WEB] Enrolled Course IDs:', myCourseIds);
                }
            } catch (e) {
                console.error("Failed to fetch enrollments for presence", e);
            }

            // Track in Global Channel
            console.log('[PRESENCE-WEB] Subscribing to presence:battle-global...');
            const channel = supabase.channel('presence:battle-global')
                .on('presence', { event: 'sync' }, () => {
                    const newState = channel.presenceState();
                    console.log('[PRESENCE-WEB] Sync received. Raw State Keys:', Object.keys(newState));
                    const users: any[] = [];
                    Object.values(newState).forEach((state: any) => {
                        state.forEach((presence: any) => {
                            if (presence.id !== userId && presence.status !== 'OFFLINE') {
                                // Filter by shared courses
                                const theirCourses = presence.course_ids || [];
                                const hasShared = myCourseIds.length > 0 && theirCourses.length > 0 &&
                                    myCourseIds.some(id => theirCourses.includes(id));

                                console.log(`[PRESENCE-WEB] User ${presence.username || presence.id} courses:`, theirCourses, 'Match:', hasShared);

                                if (hasShared) {
                                    users.push(presence);
                                }
                            }
                        });
                    });

                    // Deduplicate
                    const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
                    console.log('[PRESENCE-WEB] Final filtered users count:', uniqueUsers.length);
                    setOnlineUsers(uniqueUsers);
                })
                .subscribe(async (status: string) => {
                    console.log('[PRESENCE-WEB] Channel Subscribe Status:', status);
                    if (status === 'SUBSCRIBED') {
                        const trackRes = await channel.track({
                            id: userId,
                            username: username,
                            image: userImage,
                            online_at: new Date().toISOString(),
                            status: userStatus,
                            course_ids: myCourseIds
                        });
                        console.log('[PRESENCE-WEB] Track Result:', trackRes);
                    }
                });

            return () => {
                console.log('[PRESENCE-WEB] Removing global presence channel');
                supabase.removeChannel(channel);
            };
        };

        const cleanupPromise = fetchEnrollments();
        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, [session, supabase, userStatus]);

    const updatePresenceStatus = useCallback(async (status: UserStatus) => {
        console.log('[PRESENCE-WEB] Updating local status to:', status);
        setUserStatus(status);
        // The useEffect will handle re-tracking with new status
    }, []);

    const joinCourseRoom = useCallback((courseId: string) => {
        setActiveCourseId((prev) => (prev !== courseId ? courseId : prev));
    }, []);

    const leaveCourseRoom = useCallback(() => {
        setActiveCourseId(null);
        // setOnlineUsers([]); // DO NOT CLEAR GLOBAL LIST
        setUserStatus('ONLINE'); // Reset status when leaving room
    }, []);

    const sendChallenge = useCallback(async (
        targetUserId: number,
        targetUsername: string,
        battleId: string,
        battleCode: string,
        subjectName: string,
        chapterName: string
    ) => {
        if (!supabase) return;

        const channel = supabase.channel(`notifications:user:${targetUserId}`);

        // Wait for subscription to be established
        await new Promise<void>((resolve, reject) => {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    resolve();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    reject(new Error(`Failed to subscribe: ${status}`));
                }
            });
        });

        try {
            await channel.send({
                type: 'broadcast',
                event: 'CHALLENGE_INVITE',
                payload: {
                    senderId: session?.user?.id,
                    senderName: session?.user?.name,
                    battleId,
                    battleCode, // Include code for joining
                    subjectName,
                    chapterName,
                    timestamp: Date.now()
                }
            });
        } finally {
            // Clean up the channel after sending
            await supabase.removeChannel(channel);
        }
    }, [supabase, session?.user?.id, session?.user?.name]);

    const contextValue = useMemo(() => ({
        supabase,
        onlineUsers,
        userStatus,
        updatePresenceStatus,
        joinCourseRoom,
        leaveCourseRoom,
        sendChallenge
    }), [supabase, onlineUsers, userStatus, updatePresenceStatus, joinCourseRoom, leaveCourseRoom, sendChallenge]);

    return (
        <SupabaseContext.Provider value={contextValue}>
            {children}
        </SupabaseContext.Provider>
    );
}

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error("useSupabase must be used within a SupabaseProvider");
    }
    return context;
};

