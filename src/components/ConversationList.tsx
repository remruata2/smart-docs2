"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	MessageSquarePlus,
	MessageSquare,
	Pin,
	Trash2,
	Edit2,
	MoreVertical,
	Loader2,
	List,
	History,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ConversationHistoryModal from "@/components/chat/ConversationHistoryModal";

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

interface ConversationListProps {
	isCollapsed: boolean;
	onSelectConversation?: (id: number) => void;
	onNewConversation?: () => void;
	basePath?: string;
	refreshTrigger?: number;
	selectedId?: number | null;
}

export default function ConversationList({
	isCollapsed,
	onSelectConversation,
	onNewConversation,
	basePath = "/api/dashboard/conversations",
	refreshTrigger = 0,
	selectedId,
}: ConversationListProps) {
	const router = useRouter();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

	// Load conversations
	const loadConversations = async () => {
		try {
			const response = await fetch(`${basePath}`);
			if (!response.ok) throw new Error("Failed to load conversations");

			const data = await response.json();
			setConversations(data.conversations || []);
		} catch (error) {
			console.error("Error loading conversations:", error);
			toast.error("Failed to load conversations");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadConversations();
	}, [refreshTrigger]);

	const handleNewConversation = async () => {
		if (onNewConversation) {
			onNewConversation();
		} else {
			router.push("/app/chat");
		}
	};

	const handleSelectConversation = (id: number) => {
		if (onSelectConversation) {
			onSelectConversation(id);
		} else {
			router.push(`/app/chat?id=${id}`);
		}
	};

	// Pin/Unpin conversation
	const togglePin = async (id: number, currentPinned: boolean) => {
		try {
			const response = await fetch(`${basePath}/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isPinned: !currentPinned }),
			});

			if (!response.ok) throw new Error("Failed to update conversation");

			toast.success(currentPinned ? "Unpinned" : "Pinned");
			loadConversations();
		} catch (error) {
			console.error("Error toggling pin:", error);
			toast.error("Failed to update conversation");
		}
	};

	// Delete conversation
	const deleteConversation = async (id: number) => {
		// Note: Most deletion will happen in modal now, but keeping this helper
		try {
			const response = await fetch(`${basePath}/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to delete conversation");

			toast.success("Conversation deleted");
			loadConversations();

			// If deleting current, redirect
			const currentId = searchParams.get("id");
			if (currentId && parseInt(currentId) === id) {
				router.push("/app/chat");
			}
		} catch (error) {
			console.error("Error deleting conversation:", error);
			toast.error("Failed to delete conversation");
		}
	};

	// Rename conversation
	const renameConversation = async (id: number, newTitle: string) => {
		if (!newTitle.trim()) return;

		try {
			const response = await fetch(`${basePath}/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: newTitle.trim() }),
			});

			if (!response.ok) throw new Error("Failed to rename conversation");

			toast.success("Renamed");
			loadConversations();
		} catch (error) {
			console.error("Error renaming conversation:", error);
			toast.error("Failed to rename conversation");
		} finally {
			setEditingId(null);
			setEditTitle("");
		}
	};

	// Delete all conversations
	const deleteAllConversations = async () => {
		try {
			const response = await fetch(basePath, {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to delete all conversations");

			const data = await response.json();
			toast.success(data.message || "All conversations deleted");
			loadConversations();
			router.push("/app/chat");
		} catch (error) {
			console.error("Error deleting all conversations:", error);
			toast.error("Failed to delete all conversations");
		}
	};

	const searchParams = useSearchParams();
	const currentIdParam = searchParams.get("id");
	const currentConversationId = selectedId !== undefined ? selectedId : (currentIdParam ? parseInt(currentIdParam) : null);

	// Show only 3 recent conversations in sidebar
	const recentConversations = conversations.slice(0, 3);

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className={`px-2 py-2 ${isCollapsed ? "text-center" : ""}`}>
				<Button
					onClick={handleNewConversation}
					className={`w-full bg-white/20 text-white hover:bg-white/30 border border-white/10 ${isCollapsed ? "px-2" : ""
						}`}
					variant="default"
					size={isCollapsed ? "icon" : "default"}
					title={isCollapsed ? "New AI Tutor" : ""}
				>
					<MessageSquarePlus
						className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`}
					/>
					{!isCollapsed && "New AI Tutor"}
				</Button>
			</div>

			{!isCollapsed && (
				<div className="px-2 mt-2">
					<Button
						variant="ghost"
						className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
						onClick={() => setIsHistoryModalOpen(true)}
					>
						<History className="mr-2 h-4 w-4" />
						Conversation History
					</Button>
				</div>
			)}

			{/* Collapsed State */}
			{isCollapsed && (
				<div className="flex-1 flex flex-col items-center py-2 gap-2 overflow-y-auto custom-scrollbar">
					{recentConversations.map((conv) => (
						<button
							key={conv.id}
							onClick={() => handleSelectConversation(conv.id)}
							className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-white/20 text-white/70 hover:text-white ${currentConversationId === conv.id ? "bg-white/20 text-white" : ""
								}`}
							title={conv.title}
						>
							<MessageSquare className="h-4 w-4" />
						</button>
					))}
					{conversations.length > 5 && (
						<button
							onClick={() => {
								if (onSelectConversation) {
									// If in mobile mode, maybe expand
								}
								setIsHistoryModalOpen(true);
							}}
							className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/20 text-white/70 border border-white/20 border-dashed"
							title="Show all conversations"
						>
							<List className="h-4 w-4" />
						</button>
					)}
				</div>
			)}

			<ConversationHistoryModal
				isOpen={isHistoryModalOpen}
				onClose={() => setIsHistoryModalOpen(false)}
				conversations={conversations}
				onSelectConversation={handleSelectConversation}
				onDeleteConversation={deleteConversation}
				onRenameConversation={renameConversation}
				onTogglePin={togglePin}
				onClearAllConversations={deleteAllConversations}
				currentConversationId={currentConversationId}
			/>
		</div>
	);
}
