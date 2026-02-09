"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Pin,
    Trash2,
    Edit2,
    MoreVertical,
    X,
    MessageSquare,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Re-using interface (consider moving to types file)
interface Conversation {
    id: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string | null;
    messageCount: number;
    isPinned: boolean;
    isArchived: boolean;
    lastMessage: string | null;
}

interface ConversationGroup {
    label: string;
    conversations: Conversation[];
}

interface ConversationHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Conversation[];
    onSelectConversation: (id: number) => void;
    onDeleteConversation: (id: number) => void;
    onRenameConversation: (id: number, title: string) => void;
    onTogglePin: (id: number, currentPinned: boolean) => void;
    onClearAllConversations: () => void;
    currentConversationId: number | null;
}

export default function ConversationHistoryModal({
    isOpen,
    onClose,
    conversations,
    onSelectConversation,
    onDeleteConversation,
    onRenameConversation,
    onTogglePin,
    onClearAllConversations,
    currentConversationId,
}: ConversationHistoryModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

    // Filter conversations
    const filteredConversations = searchQuery
        ? conversations.filter(
            (c) =>
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.lastMessage &&
                    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : conversations;

    // Group conversations logic (reused)
    const groupConversations = (convs: Conversation[]): ConversationGroup[] => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        const groups: ConversationGroup[] = [
            { label: "Pinned", conversations: [] },
            { label: "Today", conversations: [] },
            { label: "Yesterday", conversations: [] },
            { label: "Last 7 Days", conversations: [] },
            { label: "Older", conversations: [] },
        ];

        convs.forEach((conv) => {
            if (conv.isPinned) {
                groups[0].conversations.push(conv);
                return;
            }

            const convDate = new Date(conv.lastMessageAt || conv.updatedAt);
            if (convDate >= today) {
                groups[1].conversations.push(conv);
            } else if (convDate >= yesterday) {
                groups[2].conversations.push(conv);
            } else if (convDate >= last7Days) {
                groups[3].conversations.push(conv);
            } else {
                groups[4].conversations.push(conv);
            }
        });

        return groups.filter((group) => group.conversations.length > 0);
    };

    const groupedConversations = groupConversations(filteredConversations);

    const handleRename = (id: number) => {
        if (editTitle.trim()) {
            onRenameConversation(id, editTitle);
        }
        setEditingId(null);
        setEditTitle("");
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center justify-between">
                            <span>Conversation History</span>
                            <div className="relative w-64 mr-8">
                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search history..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-2 min-h-0">
                        <div className="px-4 py-4">
                            {filteredConversations.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    {searchQuery ? (
                                        <span>No conversations found matching &quot;{searchQuery}&quot;</span>
                                    ) : (
                                        <span>No conversation history found.</span>
                                    )}
                                </div>
                            ) : (
                                groupedConversations.map((group) => (
                                    <div key={group.label} className="mb-6">
                                        <div className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                                            {group.label}
                                            <div className="h-px bg-gray-100 flex-1" />
                                        </div>
                                        <div className="space-y-1">
                                            {group.conversations.map((conv) => (
                                                <div
                                                    key={conv.id}
                                                    className={`group relative rounded-lg transition-colors border ${currentConversationId === conv.id
                                                        ? "bg-blue-50 border-blue-200"
                                                        : "hover:bg-gray-50 border-transparent hover:border-gray-100"
                                                        }`}
                                                >
                                                    {editingId === conv.id ? (
                                                        <div className="p-2">
                                                            <Input
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                onBlur={() => handleRename(conv.id)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") handleRename(conv.id);
                                                                    else if (e.key === "Escape") {
                                                                        setEditingId(null);
                                                                        setEditTitle("");
                                                                    }
                                                                }}
                                                                autoFocus
                                                                className="h-9"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center p-3 pr-12">
                                                            <button
                                                                onClick={() => {
                                                                    onSelectConversation(conv.id);
                                                                    onClose();
                                                                }}
                                                                className="flex-1 text-left min-w-0 flex items-start gap-3"
                                                            >
                                                                <div className={`p-2 rounded-lg ${currentConversationId === conv.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm"
                                                                    }`}>
                                                                    <MessageSquare className="h-4 w-4" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-gray-900 truncate">
                                                                            {conv.title}
                                                                        </span>
                                                                        {conv.isPinned && (
                                                                            <Pin className="h-3 w-3 text-blue-500 fill-blue-500" />
                                                                        )}
                                                                    </div>
                                                                    {conv.lastMessage && (
                                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                            {conv.lastMessage}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                                        {new Date(conv.lastMessageAt || conv.createdAt).toLocaleString(undefined, {
                                                                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                                                        })} • {conv.messageCount} msgs
                                                                    </p>
                                                                </div>
                                                            </button>

                                                            {/* Actions */}
                                                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConversationToDelete(conv.id);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingId(conv.id);
                                                                                setEditTitle(conv.title);
                                                                            }}
                                                                        >
                                                                            <Edit2 className="h-4 w-4 mr-2" />
                                                                            Rename
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onTogglePin(conv.id, conv.isPinned);
                                                                            }}
                                                                        >
                                                                            <Pin className="h-4 w-4 mr-2" />
                                                                            {conv.isPinned ? "Unpin" : "Pin"}
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {conversations.length > 0 && (
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                            <p className="text-xs text-gray-500">
                                {conversations.length} total conversations
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setClearAllDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear All History
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete One Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this conversation and all its messages.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (conversationToDelete) {
                                    onDeleteConversation(conversationToDelete);
                                    setDeleteDialogOpen(false);
                                    setConversationToDelete(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear All Confirmation */}
            <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All History?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete ALL conversations. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                onClearAllConversations();
                                setClearAllDialogOpen(false);
                                onClose();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Clear All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
