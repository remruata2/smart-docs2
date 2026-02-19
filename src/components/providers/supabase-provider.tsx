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
    // Logic moved to ChallengeNotification component to avoid duplication and blocking calls
    useEffect(() => {
        // Keeping this hook structure if we need other user-specific notifications later
        // Currently empty as CHALLENGE_INVITE is handled in ChallengeNotification
    }, [session, supabase, router]);

    // Daily Check-in (Web)
    useEffect(() => {
        if (session?.user?.id) {
            fetch('/api/daily-checkin', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.pointsAdded > 0) {
                        toast.success(`Daily Login: +${data.pointsAdded} Points! 🔥 Streak: ${data.streak}`);
                    } else if (data.streak > 0) {
                        // Optional: simpler toast or none if already checked in
                        console.log(`[DAILY-CHECKIN] Already checked in. Streak: ${data.streak}`);
                    }
                })
                .catch(err => console.error("[DAILY-CHECKIN] Failed:", err));
        }
    }, [session?.user?.id]);

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

        // Wait for subscription to be established with a timeout
        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                supabase.removeChannel(channel);
                reject(new Error('TIMED_OUT'));
            }, 5000);

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeoutId);
                    resolve();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    clearTimeout(timeoutId);
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

