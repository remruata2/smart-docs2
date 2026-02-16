"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Swords, X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FloatingOnlineWidgetProps {
    onChallengeUser: (user: any) => void;
    defaultStatus?: 'ONLINE' | 'IN_LOBBY' | 'IN_GAME';
}

export function FloatingOnlineWidget({ onChallengeUser, defaultStatus = 'ONLINE' }: FloatingOnlineWidgetProps) {
    const { data: session } = useSession();
    const { onlineUsers, userStatus, updatePresenceStatus } = useSupabase();
    const [isExpanded, setIsExpanded] = useState(false);

    const currentUserId = session?.user?.id ? parseInt(session.user.id) : null;
    const others = onlineUsers.filter((u) => u.id !== currentUserId);

    // Toggle offline status
    const toggleOffline = (checked: boolean) => {
        if (checked) {
            // Going online -> restore default status (e.g. IN_LOBBY if we are in lobby)
            updatePresenceStatus(defaultStatus);
            toast.success("You are now online");
        } else {
            // Going offline
            updatePresenceStatus('OFFLINE');
            toast.info("You are now invisible");
        }
    };

    const toggleExpanded = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isExpanded) {
                setIsExpanded(false);
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isExpanded]);

    return (
        <div className="fixed bottom-32 right-4 md:bottom-4 md:right-4 z-[100] flex flex-col items-end gap-2">
            {/* Expanded Panel */}
            <div
                className={cn(
                    "bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 ease-out",
                    isExpanded
                        ? "opacity-100 translate-y-0 max-h-[400px] w-72"
                        : "opacity-0 translate-y-4 max-h-0 w-72 pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                            <Users className="h-4 w-4 text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-slate-200">Online Now</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={() => setIsExpanded(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Status Toggle */}
                <div className="px-3 py-2 border-b border-slate-700/30 flex items-center justify-between mx-1 bg-slate-800/20">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${userStatus === 'OFFLINE' ? 'bg-slate-500' : 'bg-emerald-500'}`} />
                        <Label htmlFor="online-mode" className="text-xs text-slate-300 cursor-pointer">
                            {userStatus === 'OFFLINE' ? 'Invisible' : 'Online'}
                        </Label>
                    </div>
                    <Switch
                        id="online-mode"
                        checked={userStatus !== 'OFFLINE'}
                        onCheckedChange={toggleOffline}
                        className="scale-90 data-[state=checked]:bg-emerald-500"
                    />
                </div>

                {/* User List */}
                <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
                    {others.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                            No one else is online right now.
                        </div>
                    ) : (
                        others.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/70 transition-colors group cursor-pointer"
                                onClick={() => onChallengeUser(user)}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                        <Avatar className="h-9 w-9 border-2 border-slate-700">
                                            <AvatarImage src={user.image} />
                                            <AvatarFallback className="bg-slate-700 text-xs font-medium">
                                                {user.username?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium transition-colors ${user.status === 'IN_GAME' || user.status === 'IN_LOBBY'
                                            ? "text-slate-400"
                                            : "text-slate-200 group-hover:text-white"
                                            }`}>
                                            {user.username}
                                        </span>
                                        <span className={`text-[10px] ${user.status === 'IN_GAME' ? "text-purple-400" :
                                            user.status === 'IN_LOBBY' ? "text-amber-400" :
                                                "text-emerald-400/80"
                                            }`}>
                                            {user.status === 'IN_GAME' ? "In Battle" :
                                                user.status === 'IN_LOBBY' ? "In Lobby" :
                                                    "Online"}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={user.status === 'IN_GAME' || user.status === 'IN_LOBBY'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChallengeUser(user);
                                    }}
                                    title={user.status === 'IN_GAME' || user.status === 'IN_LOBBY' ? "User is busy" : "Challenge to Battle"}
                                >
                                    <Swords className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Floating Action Button */}
            <Button
                onClick={toggleExpanded}
                className={cn(
                    "relative h-14 w-14 rounded-full shadow-lg transition-all duration-300",
                    "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500",
                    "hover:scale-110 active:scale-95",
                    isExpanded && "rotate-180"
                )}
            >
                {isExpanded ? (
                    <ChevronUp className="h-6 w-6 text-white" />
                ) : (
                    <Users className="h-6 w-6 text-white" />
                )}

                {/* Online Count Badge */}
                {others.length > 0 && !isExpanded && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-950 animate-pulse">
                        {others.length}
                    </span>
                )}
            </Button>
        </div>
    );
}
