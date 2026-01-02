"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	MessageSquarePlus,
	MessageSquare,
	Search,
	Pin,
	Trash2,
	Edit2,
	MoreVertical,
	Loader2,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
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
import { useRouter, useSearchParams } from "next/navigation";

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

interface ConversationListProps {
	isCollapsed: boolean;
	onSelectConversation?: (id: number) => void;
	basePath?: string;
	refreshTrigger?: number;
}

export default function ConversationList({
	isCollapsed,
	onSelectConversation,
	basePath = "/api/dashboard/conversations",
	refreshTrigger = 0,
}: ConversationListProps) {
	const router = useRouter();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	// State for Clear All dialog only
	const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

	// Load conversations
	const loadConversations = async () => {
		try {
			const params = new URLSearchParams();
			if (searchQuery) params.append("search", searchQuery);

			const response = await fetch(`${basePath}?${params}`);
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
	}, [searchQuery, refreshTrigger]);

	// Group conversations by date
	const groupConversations = (): ConversationGroup[] => {
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

		conversations.forEach((conv) => {
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

	const handleNewConversation = async () => {
		router.push("/app/chat");
		// Ideally we would trigger a refresh or reset state here
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

	const searchParams = useSearchParams();
	const currentIdParam = searchParams.get("id");
	const currentConversationId = currentIdParam ? parseInt(currentIdParam) : null;

	// Delete conversation
	const deleteConversation = async (id: number) => {
		if (!window.confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
			return;
		}

		try {
			const response = await fetch(`${basePath}/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to delete conversation");

			toast.success("Conversation deleted");

			// If we deleted the current conversation, redirect to new chat
			if (currentConversationId === id) {
				router.push("/app/chat");
			}

			loadConversations();
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
		} catch (error) {
			console.error("Error deleting all conversations:", error);
			toast.error("Failed to delete all conversations");
		} finally {
			setClearAllDialogOpen(false);
		}
	};

	const groupedConversations = groupConversations();

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
					{/* Search */}
					<div className="px-2 pb-2">
						<div className="relative">
							<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-white/50" />
							<Input
								type="text"
								placeholder="Search..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-7 h-8 text-xs bg-white/10 border border-white/10 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:ring-1"
							/>
						</div>
					</div>

					{/* Conversation List */}
					<div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
						{isLoading ? (
							<div className="flex items-center justify-center h-20">
								<Loader2 className="h-4 w-4 animate-spin text-white/50" />
							</div>
						) : groupedConversations.length === 0 ? (
							<div className="p-4 text-center text-white/50 text-md">
								No conversations yet.
							</div>
						) : (
							groupedConversations.map((group) => (
								<div key={group.label} className="mb-3">
									<div className="px-2 py-1 text-[10px] font-semibold text-white/60 uppercase tracking-wider">
										{group.label}
									</div>
									<div className="space-y-0.5">
										{group.conversations.map((conv) => (
											<div
												key={conv.id}
												className="group relative rounded-md transition-colors hover:bg-white/10"
											>
												{editingId === conv.id ? (
													<div className="p-1">
														<Input
															value={editTitle}
															onChange={(e) => setEditTitle(e.target.value)}
															onBlur={() =>
																renameConversation(conv.id, editTitle)
															}
															onKeyDown={(e) => {
																if (e.key === "Enter") {
																	renameConversation(conv.id, editTitle);
																} else if (e.key === "Escape") {
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

														{/* Actions dropdown */}
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
																		onClick={() =>
																			togglePin(conv.id, conv.isPinned)
																		}
																		className="text-xs focus:bg-gray-100 focus:text-gray-900"
																	>
																		<Pin className="h-3 w-3 mr-2" />
																		{conv.isPinned ? "Unpin" : "Pin"}
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => deleteConversation(conv.id)}
																		className="text-xs text-red-500 focus:bg-gray-100 focus:text-red-600"
																	>
																		<Trash2 className="h-3 w-3 mr-2" />
																		Delete
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
							))
						)}
					</div>
				</>
			)}

			{/* Collapsed State - Show Icons Only */}
			{isCollapsed && (
				<div className="flex-1 flex flex-col items-center py-2 gap-2 overflow-y-auto custom-scrollbar">
					{conversations.slice(0, 10).map((conv) => (
						<button
							key={conv.id}
							onClick={() => handleSelectConversation(conv.id)}
							className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-white/20 text-white/70 hover:text-white"
							title={conv.title}
						>
							<MessageSquare className="h-4 w-4" />
						</button>
					))}
				</div>
			)}

			{/* Clear All Conversations Button */}
			{!isCollapsed && conversations.length > 0 && (
				<div className="p-2 border-t border-white/10">
					<Button
						variant="ghost"
						size="sm"
						className="w-full text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 justify-start px-2"
						onClick={() => setClearAllDialogOpen(true)}
					>
						<Trash2 className="h-3 w-3 mr-2" />
						Clear History
					</Button>
				</div>
			)}

			{/* Clear All Confirmation Dialog */}
			<AlertDialog
				open={clearAllDialogOpen}
				onOpenChange={setClearAllDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete All Conversations?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete all {conversations.length}{" "}
							conversation
							{conversations.length !== 1 ? "s" : ""} and all their messages.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={deleteAllConversations}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete All
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
