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
	Archive,
	MoreVertical,
	Loader2,
	ChevronLeft,
	ChevronRight,
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

interface ConversationSidebarProps {
	currentConversationId: number | null;
	onSelectConversation: (id: number) => void;
	onNewConversation: () => void;
}

export default function ConversationSidebar({
	currentConversationId,
	onSelectConversation,
	onNewConversation,
}: ConversationSidebarProps) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [conversationToDelete, setConversationToDelete] = useState<
		number | null
	>(null);
	const [isCollapsed, setIsCollapsed] = useState(false);

	// Load conversations
	const loadConversations = async () => {
		try {
			const params = new URLSearchParams();
			if (searchQuery) params.append("search", searchQuery);

			const response = await fetch(`/api/admin/conversations?${params}`);
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
	}, [searchQuery]);

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

	// Pin/Unpin conversation
	const togglePin = async (id: number, currentPinned: boolean) => {
		try {
			const response = await fetch(`/api/admin/conversations/${id}`, {
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
		try {
			const response = await fetch(`/api/admin/conversations/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to delete conversation");

			toast.success("Conversation deleted");
			if (currentConversationId === id) {
				onNewConversation(); // Start new conversation if current was deleted
			}
			loadConversations();
		} catch (error) {
			console.error("Error deleting conversation:", error);
			toast.error("Failed to delete conversation");
		} finally {
			setDeleteDialogOpen(false);
			setConversationToDelete(null);
		}
	};

	// Rename conversation
	const renameConversation = async (id: number, newTitle: string) => {
		if (!newTitle.trim()) return;

		try {
			const response = await fetch(`/api/admin/conversations/${id}`, {
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

	const groupedConversations = groupConversations();

	return (
		<div
			className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out relative ${
				isCollapsed ? "w-16" : "w-64"
			}`}
		>
			{/* Collapse/Expand Toggle */}
			<button
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="absolute -right-3 top-8 z-10 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 shadow-sm"
				title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
			>
				{isCollapsed ? (
					<ChevronRight className="h-4 w-4 text-gray-600" />
				) : (
					<ChevronLeft className="h-4 w-4 text-gray-600" />
				)}
			</button>

			{/* Header */}
			<div
				className={`p-4 border-b border-gray-200 ${isCollapsed ? "px-2" : ""}`}
			>
				<Button
					onClick={onNewConversation}
					className={`w-full ${isCollapsed ? "px-2" : ""}`}
					variant="default"
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
					<div className="p-3 border-b border-gray-200">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								type="text"
								placeholder="Search conversations..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9 h-9"
							/>
						</div>
					</div>

					{/* Conversation List */}
					<div className="flex-1 overflow-y-auto">
						{isLoading ? (
							<div className="flex items-center justify-center h-32">
								<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
							</div>
						) : groupedConversations.length === 0 ? (
							<div className="p-4 text-center text-gray-500 text-sm">
								No conversations yet.
								<br />
								Start chatting to create one!
							</div>
						) : (
							groupedConversations.map((group) => (
								<div key={group.label} className="mb-4">
									<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
										{group.label}
									</div>
									<div className="space-y-1">
										{group.conversations.map((conv) => (
											<div
												key={conv.id}
												className={`group relative mx-2 rounded-lg transition-colors ${
													currentConversationId === conv.id
														? "bg-blue-50 border border-blue-200"
														: "hover:bg-gray-50 border border-transparent"
												}`}
											>
												{editingId === conv.id ? (
													<div className="p-2">
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
															className="h-8 text-sm"
														/>
													</div>
												) : (
													<>
														<button
															onClick={() => onSelectConversation(conv.id)}
															className="w-full text-left p-2 pr-8"
														>
															<div className="flex items-start gap-2">
																{conv.isPinned && (
																	<Pin className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
																)}
																<div className="flex-1 min-w-0">
																	<div className="text-sm font-medium text-gray-900 truncate">
																		{conv.title}
																	</div>
																	{conv.lastMessage && (
																		<div className="text-xs text-gray-500 truncate mt-0.5">
																			{conv.lastMessage}
																		</div>
																	)}
																	<div className="text-xs text-gray-400 mt-0.5">
																		{conv.messageCount}{" "}
																		{conv.messageCount === 1
																			? "message"
																			: "messages"}
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
																		className="h-7 w-7"
																	>
																		<MoreVertical className="h-3.5 w-3.5" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem
																		onClick={() => {
																			setEditingId(conv.id);
																			setEditTitle(conv.title);
																		}}
																	>
																		<Edit2 className="h-3.5 w-3.5 mr-2" />
																		Rename
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() =>
																			togglePin(conv.id, conv.isPinned)
																		}
																	>
																		<Pin className="h-3.5 w-3.5 mr-2" />
																		{conv.isPinned ? "Unpin" : "Pin"}
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => {
																			setConversationToDelete(conv.id);
																			setDeleteDialogOpen(true);
																		}}
																		className="text-red-600"
																	>
																		<Trash2 className="h-3.5 w-3.5 mr-2" />
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
				<div className="flex-1 flex flex-col items-center py-4 gap-3 overflow-y-auto">
					{conversations.slice(0, 10).map((conv) => (
						<button
							key={conv.id}
							onClick={() => onSelectConversation(conv.id)}
							className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
								currentConversationId === conv.id
									? "bg-blue-100 text-blue-600"
									: "hover:bg-gray-100 text-gray-600"
							}`}
							title={conv.title}
						>
							<MessageSquare className="h-5 w-5" />
						</button>
					))}
				</div>
			)}

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete the conversation and all its
							messages. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								conversationToDelete && deleteConversation(conversationToDelete)
							}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
