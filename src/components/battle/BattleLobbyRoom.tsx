"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Swords, Copy, LogOut, Loader2, Send, CheckCircle2, Circle, Settings, Clock, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FloatingOnlineWidget } from "@/components/battle/FloatingOnlineWidget";
import { ChallengeModal } from "@/components/battle/ChallengeModal";
import { useSupabase } from "@/components/providers/supabase-provider";
import { BattleSettingsDialog } from "@/components/battle/BattleSettingsDialog";

interface BattleLobbyRoomProps {
    battle: any;
    currentUser: { id: number; username: string };
    participants: any[]; // Changed from opponent to participants list
    supabase: any;
    isHost: boolean;
    onStart: () => void;
    onLeave: () => void;
    isLeaving?: boolean;
}

interface ChatMessage {
    id: string;
    userId: number;
    username: string;
    message: string;
    timestamp: Date;
}

export function BattleLobbyRoom({
    battle,
    currentUser,
    participants,
    supabase,
    isHost,
    onStart,
    onLeave,
    isLeaving = false,
}: BattleLobbyRoomProps) {
    const { updatePresenceStatus, sendChallenge } = useSupabase();
    const router = useRouter();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isReady, setIsReady] = useState(false);
    // Track ready status of all OTHER participants by ID
    const [readyMap, setReadyMap] = useState<Record<number, boolean>>(() => {
        const initialMap: Record<number, boolean> = {};
        participants.forEach((p: any) => {
            if (p.user_id) initialMap[p.user_id] = p.is_ready || false;
        });
        return initialMap;
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Set status to IN_LOBBY on mount
    useEffect(() => {
        updatePresenceStatus('IN_LOBBY');
        return () => {
            // No strict need to reset here as leaving will trigger 'ONLINE' in provider,
            // or if we navigate to battle arena it will set 'IN_GAME' (or we can handle it there)
            // But good practice if unmounting component but staying in app
            // updatePresenceStatus('ONLINE'); // Handled by provider's leaveCourseRoom logic or new page
        };
    }, [updatePresenceStatus]);

    // Update readyMap when participants change (e.g. new player joins)
    useEffect(() => {
        setReadyMap(prev => {
            const newMap = { ...prev };
            participants.forEach((p: any) => {
                // If user not in map (newly joined), set to their DB status or false
                if (newMap[p.user_id] === undefined) {
                    newMap[p.user_id] = p.is_ready || false;
                }
            });
            return newMap;
        });
    }, [participants]);

    const handleOpenChallengeModal = async (user: any) => {
        // Direct invite in lobby (bypass modal)
        const toastId = toast.loading(`Inviting ${user.username} to lobby...`);
        try {
            await sendChallenge(
                user.id,
                user.username,
                battle.id,
                battle.code,
                battle.quiz.subject?.name || "Quiz Battle",
                battle.quiz.chapter?.title || "Chapter Challenge"
            );
            toast.success(`Invite sent to ${user.username}!`, { id: toastId });
        } catch (error: any) {
            toast.error("Failed to send invite", { id: toastId });
        }
    };

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle kick
    const handleKick = async (targetUserId: number, targetUsername: string) => {
        if (!confirm(`Are you sure you want to kick ${targetUsername}?`)) return;

        try {
            await fetch("/api/battle/kick", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    battleId: battle.id,
                    targetUserId: targetUserId
                })
            });
            toast.success(`${targetUsername} kicked from lobby`);
            // We rely on realtime update to remove them from list, or manual refresh
        } catch (error) {
            console.error("Failed to kick player", error);
            toast.error("Failed to kick player");
        }
    };

    // Subscribe to lobby events
    useEffect(() => {
        if (!supabase || !battle?.id) return;

        // 1. Lobby Chat & Status
        // 1. Lobby Chat & Status
        const channel = supabase.channel(`battle:${battle.id}`)
            .on('broadcast', { event: 'CHAT_MESSAGE' }, (payload: any) => {
                const msg = payload.payload;
                if (msg && msg.userId !== currentUser.id) {
                    setMessages((prev) => [...prev, {
                        id: crypto.randomUUID(),
                        userId: msg.userId,
                        username: msg.username,
                        message: msg.message,
                        timestamp: new Date(msg.timestamp),
                    }]);
                }
            })
            // Unified BATTLE_UPDATE listener (Matches Mobile & Backend)
            .on('broadcast', { event: 'BATTLE_UPDATE' }, (payload: any) => {
                const data = payload.payload;
                if (!data) return;

                if (data.type === 'READY_UPDATE') {
                    const { userId, isReady } = data; // Backend sends 'isReady', check battle-service line 235
                    if (userId !== currentUser.id) {
                        setReadyMap(prev => ({ ...prev, [userId]: isReady }));
                    }
                } else if (data.type === 'PLAYER_JOINED') {
                    // Ideally trigger a refresh or add to list, but for now relying on parent/refresh
                    router.refresh();
                } else if (data.type === 'SETTINGS_UPDATE') {
                    router.refresh();
                }
            })
            .subscribe();

        // 2. Host Presence
        // ... (keep logic)

        // 3. Lobby Presence (Host Only)
        let lobbyChannel: any = null;
        if (isHost && battle.is_public) {
            lobbyChannel = supabase.channel('battle_lobby_presence');

            lobbyChannel
                .on('presence', { event: 'sync' }, () => {
                    // console.log('Lobby presence synced');
                })
                .subscribe(async (status: any) => {
                    if (status === 'SUBSCRIBED') {
                        await lobbyChannel.track({
                            battle_id: battle.id,
                            code: battle.code,
                            subject_name: battle.quiz?.chapter?.subject?.name,
                            chapter_title: battle.quiz?.chapter?.title,
                            host_username: currentUser.username,
                            created_at: battle.created_at,
                            participants_count: participants.length + 1, // +1 for host
                            is_public: true
                        });
                    }
                });
        }

        return () => {
            supabase.removeChannel(channel);
            if (lobbyChannel) supabase.removeChannel(lobbyChannel);
        };
    }, [supabase, battle?.id, currentUser.id, onLeave, isHost, battle?.is_public, participants.length, router]);

    const sendMessage = useCallback(async () => {
        if (!newMessage.trim() || !supabase) return;

        const msg = {
            userId: currentUser.id,
            username: currentUser.username,
            message: newMessage.trim(),
            timestamp: new Date().toISOString(),
        };

        // Add to local state immediately
        setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            ...msg,
            timestamp: new Date(msg.timestamp),
        }]);

        // Broadcast to others
        await supabase.channel(`battle:${battle.id}`).send({
            type: 'broadcast',
            event: 'CHAT_MESSAGE',
            payload: msg,
        });

        setNewMessage("");
    }, [newMessage, supabase, battle?.id, currentUser]);

    const toggleReady = useCallback(async () => {
        const newReady = !isReady;
        setIsReady(newReady);

        // 1. Optimistic Broadcast (Optional, but let's stick to Server Truth or send matching signal)
        // We will rely on server broadcast to avoid race conditions and type mismatch
        // The API call below will trigger BATTLE_UPDATE -> READY_UPDATE

        // 2. Persist to DB
        try {
            await fetch("/api/battle/ready", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ battleId: battle.id, isReady: newReady })
            });
        } catch (error) {
            console.error("Failed to persist ready status", error);
            // Revert on error
            setIsReady(!newReady);
        }
    }, [isReady, battle?.id]);

    const copyCode = () => {
        navigator.clipboard.writeText(battle.code);
        toast.success("Battle code copied!");
    };

    // Check if ALL participants (including self) are ready
    // We need at least 2 players to start
    const allReady = isReady &&
        participants.length > 0 && // At least one opponent
        participants.every(p => readyMap[p.user_id]);

    const subjectName = battle.quiz?.chapter?.subject?.name || "Unknown Subject";
    const chapterName = battle.quiz?.chapter?.title || battle.quiz?.title || "Unknown Chapter";

    return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col flex-1 max-w-4xl mx-auto w-full p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLeave}
                        disabled={isLeaving}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                        {isLeaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                        Leave
                    </Button>
                    <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        Battle Lobby
                    </h1>
                    <div className="flex items-center gap-2">
                        {isHost && (
                            <BattleSettingsDialog
                                battleId={battle.id}
                                currentSettings={{
                                    subjectId: battle.quiz?.subject_id || 0,
                                    chapterId: battle.quiz?.chapter_id ? parseInt(battle.quiz.chapter_id) : null,
                                    questionCount: battle.quiz?.questions?.length || 5,
                                    durationMinutes: battle.duration_minutes || 5
                                }}
                                onUpdate={() => {
                                    // Handled by realtime broadcast, but we can force refresh if needed
                                    // router.refresh(); 
                                    window.location.reload();
                                }}
                            />
                        )}
                        <div className="w-4" /> {/* Spacer */}
                    </div>
                </div>

                {/* Battle Info */}
                <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 mb-4 backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Battle Topic</p>
                            <p className="font-semibold text-white">{subjectName}</p>
                            <p className="text-sm text-slate-400">{chapterName}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium">
                                <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-slate-200">{battle.duration_minutes || 5} min</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
                                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-slate-200">{battle.quiz?.questions?.length || "?"} Questions</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 bg-indigo-500/20 rounded-lg font-mono text-lg tracking-widest text-indigo-300 border border-indigo-500/30">
                                {battle.code}
                            </span>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={copyCode}
                                className="h-9 w-9 border-slate-700 bg-slate-800/50 hover:bg-slate-700"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Players Section (Multiplayer) */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-sm font-medium text-slate-400">
                            Players ({participants.length + 1})
                        </span>
                        {isHost && participants.length < 1 && (
                            <span className="text-xs text-yellow-400 animate-pulse">
                                Waiting for players...
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {/* Current User */}
                        <div className={cn(
                            "bg-slate-900/80 border rounded-xl p-3 backdrop-blur-xl transition-all flex items-center justify-between",
                            isReady ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-700"
                        )}>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-indigo-500/30">
                                    <AvatarFallback className="bg-indigo-500/20 text-indigo-300 font-bold">
                                        {currentUser.username?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-white text-sm">{currentUser.username} (You)</p>
                                    <p className="text-xs text-indigo-400">{isHost ? "Host" : "Player"}</p>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <Checkbox
                                    checked={isReady}
                                    onCheckedChange={toggleReady}
                                    className="border-slate-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <span className={cn(
                                    "text-xs font-medium transition-colors",
                                    isReady ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"
                                )}>
                                    Ready
                                </span>
                            </label>
                        </div>

                        {/* Other Participants */}
                        {participants.map((p: any) => {
                            const isPReady = readyMap[p.user_id];
                            return (
                                <div key={p.user_id} className={cn(
                                    "bg-slate-900/80 border rounded-xl p-3 backdrop-blur-xl transition-all flex items-center justify-between",
                                    isPReady ? "border-emerald-500/50 bg-emerald-500/5" : "border-slate-800"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-slate-700">
                                            <AvatarFallback className="bg-slate-800 text-slate-400 font-bold">
                                                {p.user?.username?.[0]?.toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-slate-200 text-sm">{p.user?.username || "Unknown"}</p>
                                            <p className="text-xs text-slate-500">Player</p>
                                        </div>
                                    </div>

                                    {/* Kick Button for Host */}
                                    <div className="flex items-center gap-2">
                                        {isHost && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-slate-800"
                                                title="Kick Player"
                                                onClick={() => handleKick(p.user_id, p.user?.username)}
                                            >
                                                <LogOut className="h-3.5 w-3.5" />
                                            </Button>
                                        )}

                                        {isPReady ? (
                                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                                <CheckCircle2 className="h-3 w-3" />
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700">
                                                <Circle className="h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty Slots visualization (optional, fills up to 4 for visual balance) */}
                        {Array.from({ length: Math.max(0, 3 - participants.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="border border-dashed border-slate-800 rounded-xl p-3 flex items-center justify-center opacity-30">
                                <span className="text-xs text-slate-500 font-medium">Open Slot</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Start Button Area */}
                {/* Only host sees start button, but only when everyone is ready */}
                {/* Non-hosts see waiting status */}
                <div className="mb-4">
                    <div className="mb-4">
                        {!isHost && (
                            <div className="w-full h-12 flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400">
                                {allReady ? (
                                    <span className="flex items-center text-emerald-400 font-medium animate-pulse">
                                        <Swords className="mr-2 h-5 w-5" />
                                        Host is starting the battle...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Waiting for everyone to be ready...
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Section */}
                <div className="flex-1 flex flex-col bg-slate-900/80 border border-slate-700 rounded-2xl backdrop-blur-xl overflow-hidden min-h-[200px]">
                    <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-800/30">
                        <p className="text-sm font-medium text-slate-300">💬 Pre-Battle Chat</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-8">
                                No messages yet. Say hello!
                            </p>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-2",
                                        msg.userId === currentUser.id ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={cn(
                                        "max-w-[70%] rounded-2xl px-4 py-2",
                                        msg.userId === currentUser.id
                                            ? "bg-indigo-500/20 text-indigo-100"
                                            : "bg-slate-800 text-slate-200"
                                    )}>
                                        {msg.userId !== currentUser.id && (
                                            <p className="text-xs text-slate-400 mb-1">{msg.username}</p>
                                        )}
                                        <p className="text-sm">{msg.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-slate-700/50 bg-slate-800/20">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            />
                            <Button
                                size="icon"
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className="bg-indigo-500 hover:bg-indigo-400 shrink-0"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Start Button (Host Only) */}
                {isHost && (
                    <div className="mt-4">
                        <Button
                            className={cn(
                                "w-full h-14 text-lg font-bold transition-all rounded-xl",
                                allReady
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20"
                                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                            )}
                            disabled={!allReady}
                            onClick={onStart}
                        >
                            {allReady ? (
                                <span className="flex items-center gap-2">
                                    <Swords className="h-5 w-5" />
                                    START BATTLE
                                </span>
                            ) : (
                                "Waiting for everyone to be ready..."
                            )}
                        </Button>
                    </div>
                )}

                {/* Guest waiting message */}
                {!isHost && (
                    <div className="mt-4 text-center">
                        <p className="text-slate-400 text-sm">
                            {allReady ? "Waiting for host to start the battle..." : "Toggle 'I'm Ready' when you're prepared!"}
                        </p>
                    </div>
                )}
            </div>

            {/* Invite from Lobby Widget */}
            <FloatingOnlineWidget
                onChallengeUser={handleOpenChallengeModal}
                defaultStatus="IN_LOBBY"
            />
        </div>
    );
}
