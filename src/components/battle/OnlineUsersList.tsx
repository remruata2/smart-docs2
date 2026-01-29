"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Swords } from "lucide-react";
import { toast } from "sonner";


export function OnlineUsersList({ currentUserId, onChallenge }: { currentUserId: number, onChallenge: (user: any) => void }) {
    const { onlineUsers } = useSupabase();

    const others = onlineUsers.filter((u) => u.id !== currentUserId);

    return (
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 text-slate-200">
                <Users className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm">Online Classmates</h3>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20 ml-auto">
                    {others.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto -mr-3 pr-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <div className="space-y-3">
                    {others.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                            No one else is online right now.
                        </div>
                    ) : (
                        others.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Avatar className="h-8 w-8 border border-slate-700">
                                            <AvatarImage src={user.image} />
                                            <AvatarFallback className="bg-slate-700 text-xs">
                                                {user.username?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-200">
                                            {user.username}
                                        </span>
                                        <span className={`text-[10px] ${user.status === 'IN_GAME' ? "text-purple-400" :
                                                user.status === 'IN_LOBBY' ? "text-amber-400" :
                                                    "text-slate-500"
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
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => onChallenge(user)}
                                    disabled={user.status === 'IN_GAME' || user.status === 'IN_LOBBY'}
                                    title={user.status === 'IN_GAME' || user.status === 'IN_LOBBY' ? "User is busy" : "Challenge to Battle"}
                                >
                                    <Swords className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
