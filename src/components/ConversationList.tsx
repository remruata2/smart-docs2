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

	// Show only 5 recent conversations in sidebar
	const recentConversations = conversations.slice(0, 5);

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
					title={isCollapsed ? "New Chat" : ""}
				>
					<MessageSquarePlus
						className={`h-4 w-4 ${isCollapsed ? "" : "mr-2"}`}
					/>
					{!isCollapsed && "New Chat"}
				</Button>
			</div>

			{!isCollapsed && (
				<>
					{/* Recent List */}
					<div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
						{isLoading ? (
							<div className="flex items-center justify-center h-20">
								<Loader2 className="h-4 w-4 animate-spin text-white/50" />
							</div>
						) : recentConversations.length === 0 ? (
							<div className="p-4 text-center text-white/50 text-md">
								No conversations yet.
							</div>
						) : (
							<div className="mb-3">
								<div className="px-2 py-1 text-[10px] font-semibold text-white/60 uppercase tracking-wider flex justify-between items-center">
									<span>Conversation History</span>
								</div>
								<div className="space-y-0.5">
									{recentConversations.map((conv) => (
										<div
											key={conv.id}
											className={`group relative rounded-md transition-colors ${currentConversationId === conv.id ? "bg-white/20" : "hover:bg-white/10"
												}`}
										>
											{editingId === conv.id ? (
												<div className="p-1">
													<Input
														value={editTitle}
														onChange={(e) => setEditTitle(e.target.value)}
														onBlur={() => renameConversation(conv.id, editTitle)}
														onKeyDown={(e) => {
															if (e.key === "Enter") renameConversation(conv.id, editTitle);
															else if (e.key === "Escape") {
																setEditingId(null);
																setEditTitle("");
															}
														}}
														autoFocus
														className="h-6 text-sm bg-white text-gray-900"
													/>
												</div>
											) : (
												<>
													<button
														onClick={() => handleSelectConversation(conv.id)}
														className="w-full text-left px-2 py-1.5 pr-6"
													>
														<div className="flex items-center gap-2">
															{conv.isPinned && (
																<Pin className="h-3 w-3 text-white/70 flex-shrink-0" />
															)}
															<div className="flex-1 min-w-0">
																<div className="text-sm font-medium text-white truncate group-hover:text-white">
																	{conv.title}
																</div>
															</div>
														</div>
													</button>

													{/* Actions */}
													<div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-5 w-5 text-white/50 hover:text-white hover:bg-white/20"
																>
																	<MoreVertical className="h-3 w-3" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent
																align="end"
																className="w-32 bg-white border border-gray-200 text-gray-800"
															>
																<DropdownMenuItem
																	onClick={() => {
																		setEditingId(conv.id);
																		setEditTitle(conv.title);
																	}}
																	className="text-xs focus:bg-gray-100 focus:text-gray-900"
																>
																	<Edit2 className="h-3 w-3 mr-2" />
																	Rename
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() => togglePin(conv.id, conv.isPinned)}
																	className="text-xs focus:bg-gray-100 focus:text-gray-900"
																>
																	<Pin className="h-3 w-3 mr-2" />
																	{conv.isPinned ? "Unpin" : "Pin"}
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</>
											)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</>
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

			{/* All History Button */}
			{!isCollapsed && conversations.length > 0 && (
				<div className="p-2 border-t border-white/10">
					<Button
						variant="ghost"
						size="sm"
						className="w-full text-xs text-white/70 hover:text-white hover:bg-white/10 justify-between px-2"
						onClick={() => setIsHistoryModalOpen(true)}
					>
						<span className="flex items-center">
							<List className="h-3 w-3 mr-2" />
							Show all conversations
						</span>
						<span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded-full">
							{conversations.length}
						</span>
					</Button>
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
