"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	Send,
	Bot,
	User,
	FileText,
	MessageSquare,
	ExternalLink,
	Copy,
	Check,
} from "lucide-react";
// PDF generation removed - using text export instead
import { toast } from "sonner";
import { ChatMessage } from "@/lib/ai-service-enhanced";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ConversationList from "@/components/ConversationList";
import { SmartChart } from "@/components/dashboard/SmartChart";

interface ChatSource {
	id: number;
	title: string;
}

function DashboardChatPageContent() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Conversation state
	const [currentConversationId, setCurrentConversationId] = useState<
		number | null
	>(null);
	const [conversationTitle, setConversationTitle] =
		useState<string>("New Conversation");
	const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

	const [model, setModel] = useState<string>("gemini-2.5-pro");
	const [models, setModels] = useState<Array<{ name: string; label: string }>>([
		{ name: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
		{ name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
	]);
	const [modelsLoading, setModelsLoading] = useState<boolean>(false);
	const [lastResponseMeta, setLastResponseMeta] = useState<{
		queryType?: string;
		searchQuery?: string;
		analysisUsed?: boolean;
	} | null>(null);
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
	// Track expanded source lists by message ID
	const [expandedSources, setExpandedSources] = useState<
		Record<string, boolean>
	>({});
	// Subject and Chapter filters
	const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>(
		[]
	);
	const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
	const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
		null
	);
	const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");

	const [chapters, setChapters] = useState<
		Array<{ id: string; title: string; chapter_number: number | null }>
	>([]);
	const [chaptersLoading, setChaptersLoading] = useState<boolean>(false);
	const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
		null
	);
	const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>("");

	// Get filters from URL
	const searchParams = useSearchParams();
	const urlSubjectId = searchParams.get("subjectId");
	const urlChapterId = searchParams.get("chapterId");

	// Load available models for current provider
	useEffect(() => {
		let cancelled = false;
		async function loadModels() {
			try {
				setModelsLoading(true);
				const res = await fetch(`/api/dashboard/ai/models?provider=gemini`);
				if (!res.ok) throw new Error("Failed to load models");
				const data = await res.json();
				if (cancelled) return;
				const list: Array<{ name: string; label: string }> = Array.isArray(
					data.models
				)
					? data.models
					: [];
				// Always have at least fallback models
				const finalModels =
					list.length > 0
						? list
						: [
							{ name: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
							{ name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
						];
				setModels(finalModels);
				// If current model not in list, set to first available
				if (
					finalModels.length > 0 &&
					!finalModels.some((m) => m.name === model)
				) {
					setModel(finalModels[0].name);
				}
			} catch (e) {
				console.error("[DashboardChat] Failed to fetch models", e);
				// Fallback to default models if API fails
				if (!cancelled) {
					const fallbackModels = [
						{ name: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
						{ name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
					];
					setModels(fallbackModels);
					if (!fallbackModels.some((m) => m.name === model)) {
						setModel(fallbackModels[0].name);
					}
				}
			} finally {
				if (!cancelled) setModelsLoading(false);
			}
		}
		loadModels();
		return () => {
			cancelled = true;
		};
	}, [model]);

	// Load available subjects
	useEffect(() => {
		async function loadSubjects() {
			try {
				setSubjectsLoading(true);
				const res = await fetch("/api/dashboard/subjects");
				if (!res.ok) throw new Error("Failed to load subjects");
				const data = await res.json();
				setSubjects(data.subjects || []);
			} catch (e) {
				console.error("[DashboardChat] Failed to fetch subjects", e);
				setSubjects([]);
			} finally {
				setSubjectsLoading(false);
			}
		}
		loadSubjects();
	}, []);

	// Load chapters when subject is selected
	useEffect(() => {
		if (!selectedSubjectId) {
			setChapters([]);
			setSelectedChapterId(null);
			setSelectedChapterTitle("");
			return;
		}

		async function loadChapters() {
			try {
				setChaptersLoading(true);
				const res = await fetch(
					`/api/dashboard/chapters?subjectId=${selectedSubjectId}`
				);
				if (!res.ok) throw new Error("Failed to load chapters");
				const data = await res.json();
				setChapters(data.chapters || []);

				// If URL has chapterId, preselect it
				if (urlChapterId && data.chapters) {
					const chapter = data.chapters.find((c: any) => c.id === urlChapterId);
					if (chapter) {
						setSelectedChapterId(chapter.id);
						setSelectedChapterTitle(chapter.title);
					}
				}
			} catch (e) {
				console.error("[DashboardChat] Failed to fetch chapters", e);
				setChapters([]);
			} finally {
				setChaptersLoading(false);
			}
		}
		loadChapters();
	}, [selectedSubjectId, urlChapterId]);

	// Preselect subject/chapter from URL params on mount
	useEffect(() => {
		if (urlSubjectId && subjects.length > 0) {
			const subjectIdNum = parseInt(urlSubjectId, 10);
			if (!isNaN(subjectIdNum)) {
				const subject = subjects.find((s) => s.id === subjectIdNum);
				if (subject) {
					setSelectedSubjectId(subjectIdNum);
					setSelectedSubjectName(subject.name);
				}
			}
		}
	}, [urlSubjectId, subjects]);

	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Initial number of sources to show
	const INITIAL_SOURCES_SHOWN = 15;

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollAreaRef.current) {
			scrollAreaRef.current.scrollTo({
				top: scrollAreaRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [messages]);

	// Focus input on mount
	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// === CONVERSATION MANAGEMENT FUNCTIONS ===

	// Generate a title from the first user message
	const generateTitleFromQuery = (query: string): string => {
		// Clean up the query
		let title = query.trim();

		// Remove common prefixes
		title = title.replace(
			/^(show|list|find|get|tell|what|who|when|where|how|can you|please)\s+/i,
			""
		);

		// Limit length to 50 characters
		if (title.length > 50) {
			title = title.substring(0, 47) + "...";
		}

		// Capitalize first letter
		if (title.length > 0) {
			title = title.charAt(0).toUpperCase() + title.slice(1);
		}

		// Fallback if empty
		return title || "New Conversation";
	};

	// Create a new conversation
	const createNewConversation = async (
		firstMessage?: string
	): Promise<number> => {
		try {
			const title = firstMessage
				? generateTitleFromQuery(firstMessage)
				: "New Conversation";

			const response = await fetch("/api/dashboard/conversations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title }),
			});

			if (!response.ok) throw new Error("Failed to create conversation");

			const data = await response.json();
			return data.conversation.id;
		} catch (error) {
			console.error("Error creating conversation:", error);
			toast.error("Failed to create conversation");
			throw error;
		}
	};

	// Save a message to the current conversation
	const saveMessageToConversation = async (
		conversationId: number,
		message: {
			role: "user" | "assistant";
			content: string;
			sources?: any[];
			tokenCount?: any;
			metadata?: any;
			chartData?: any;
		}
	) => {
		try {
			const response = await fetch(
				`/api/dashboard/conversations/${conversationId}/messages`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(message),
				}
			);

			if (!response.ok) throw new Error("Failed to save message");
		} catch (error) {
			console.error("Error saving message:", error);
			// Don't show error toast - this is background operation
		}
	};

	// Generate AI title for conversation after first exchange
	const _generateConversationTitle = async (conversationId: number) => {
		try {
			const response = await fetch(
				`/api/dashboard/conversations/${conversationId}/generate-title`,
				{
					method: "POST",
				}
			);

			if (!response.ok) throw new Error("Failed to generate title");

			const data = await response.json();
			setConversationTitle(data.title);
		} catch (error) {
			console.error("Error generating title:", error);
			// Don't show error toast
		}
	};

	// Load a conversation and its messages
	const loadConversation = async (conversationId: number) => {
		try {
			const response = await fetch(
				`/api/dashboard/conversations/${conversationId}`
			);

			if (!response.ok) throw new Error("Failed to load conversation");

			const data = await response.json();
			const conversation = data.conversation;

			// Set conversation details
			setCurrentConversationId(conversation.id);
			setConversationTitle(conversation.title);

			// Load messages
			const loadedMessages: ChatMessage[] = conversation.messages.map(
				(msg: any) => ({
					id: msg.id.toString(),
					role: msg.role,
					content: msg.content,
					timestamp: new Date(msg.timestamp),
					sources: msg.sources || [],
					tokenCount: msg.tokenCount,
					chartData: msg.metadata?.chartData || null, // Extract chartData from metadata
					// For assistant messages, always show filters
					filters:
						msg.role === "assistant" ? msg.metadata?.filters || {} : undefined,
				})
			);

			setMessages(loadedMessages);
			setError(null);

			toast.success(`Loaded: ${conversation.title}`);
		} catch (error) {
			console.error("Error loading conversation:", error);
			toast.error("Failed to load conversation");
		}
	};

	// Start a new conversation (clear messages, reset state)
	const startNewConversation = () => {
		setCurrentConversationId(null);
		setConversationTitle("New Conversation");
		setMessages([]);
		setError(null);
		setLastResponseMeta(null);
		setInputMessage("");
		toast.success("Started new conversation");
	};

	// === END CONVERSATION MANAGEMENT ===

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			id: `user_${Date.now()}`,
			role: "user",
			content: inputMessage.trim(),
			timestamp: new Date(),
		};

		// Add user message to chat
		setMessages((prev) => [...prev, userMessage]);
		setInputMessage("");
		setIsLoading(true);
		setError(null);

		// === AUTO-SAVE: Create conversation if it doesn't exist ===
		let conversationId = currentConversationId;
		if (!conversationId) {
			try {
				// Generate title from first user message
				conversationId = await createNewConversation(userMessage.content);
				setCurrentConversationId(conversationId);
				// Trigger sidebar refresh to show new conversation
				setSidebarRefreshTrigger((prev) => prev + 1);
			} catch (error) {
				console.error("Failed to create conversation:", error);
				// Continue anyway - conversation saving is not critical
			}
		}

		// === AUTO-SAVE: Save user message ===
		if (conversationId) {
			await saveMessageToConversation(conversationId, {
				role: "user",
				content: userMessage.content,
			});
			// Trigger sidebar refresh to update message count
			setSidebarRefreshTrigger((prev) => prev + 1);
		}

		// Create a placeholder assistant message for streaming with thinking indicator
		const assistantMessageId = `assistant_${Date.now()}`;

		// Always include filters
		const activeFilters: {
			subjectId?: number;
			chapterId?: number;
			subjectName?: string;
			chapterTitle?: string;
		} = {};
		if (selectedSubjectId) {
			activeFilters.subjectId = selectedSubjectId;
			activeFilters.subjectName = selectedSubjectName;
		}
		if (selectedChapterId) {
			activeFilters.chapterId = parseInt(selectedChapterId, 10);
			activeFilters.chapterTitle = selectedChapterTitle;
		}

		const assistantMessage: ChatMessage = {
			id: assistantMessageId,
			role: "assistant",
			content: "Analyzing your question and searching database...",
			timestamp: new Date(),
			sources: [],
			filters: activeFilters,
		};
		setMessages((prev) => [...prev, assistantMessage]);

		try {
			const response = await fetch("/api/dashboard/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: userMessage.content,
					conversationHistory: messages,
					provider: "gemini",
					model,
					subjectId: selectedSubjectId || undefined,
					chapterId: selectedChapterId
						? parseInt(selectedChapterId, 10)
						: undefined,
					stream: true, // Enable streaming
				}),
			});

			if (!response.ok) {
				const contentType = response.headers.get("content-type");
				if (contentType && contentType.indexOf("application/json") !== -1) {
					const errorData = await response.json();
					if (response.status === 429) {
						toast.error(
							errorData.error ||
							"You are making requests too quickly. Please wait and try again."
						);
						// Remove the placeholder message
						setMessages((prev) =>
							prev.filter((m) => m.id !== assistantMessageId)
						);
						return;
					}
					throw new Error(errorData.error || "An unknown error occurred");
				} else {
					const errorText = await response.text();
					console.error("Received non-JSON error response:", errorText);

					let errorMessage = "The server returned an unexpected response";
					if (errorText.includes("504 Gateway Time-out")) {
						errorMessage = "Server timeout. Please try again later.";
					} else if (errorText.includes("502 Bad Gateway")) {
						errorMessage = "Server error. Please try again later.";
					} else if (errorText.includes("500 Internal Server Error")) {
						errorMessage = "Internal server error. Please try again later.";
					}

					toast.error(errorMessage);
					throw new Error(errorMessage);
				}
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let accumulatedContent = "";
			let metadata: any = {};
			let isFirstToken = true;
			let assistantSources: any[] = [];
			let assistantTokenCount: any = null;
			let assistantChartData: any = null;

			if (!reader) {
				throw new Error("Failed to get response reader");
			}

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));
							console.log(
								"[STREAM] Received event type:",
								data.type,
								"for message:",
								assistantMessageId
							);

							if (data.type === "metadata") {
								metadata = data;
								setLastResponseMeta({
									queryType: data.queryType,
									searchQuery: data.searchQuery,
									analysisUsed: data.analysisUsed,
								});
								// Don't update content here - progress events handle that
							} else if (data.type === "progress") {
								// Update with progress message
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? {
												...msg,
												content: data.progress || "Processing...",
											}
											: msg
									)
								);
							} else if (data.type === "token") {
								// Clear placeholder only on first token
								if (isFirstToken) {
									isFirstToken = false;
									accumulatedContent = data.text || "";
								} else {
									accumulatedContent += data.text || "";
								}
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, content: accumulatedContent }
											: msg
									)
								);
							} else if (data.type === "sources") {
								// Update sources
								assistantSources = data.sources || [];
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, sources: assistantSources }
											: msg
									)
								);
							} else if (data.type === "data") {
								// Handle chart data
								console.log("[CHART FRONTEND] Received 'data' event:", data);
								console.log(
									"[CHART FRONTEND] Current assistantMessageId:",
									assistantMessageId
								);
								if (data.chartData) {
									console.log(
										"[CHART FRONTEND] Chart data present, updating message:",
										assistantMessageId
									);
									console.log(
										"[CHART FRONTEND] Chart data:",
										JSON.stringify(data.chartData, null, 2)
									);
									setMessages((prev) => {
										console.log(
											"[CHART FRONTEND] Current messages before update:",
											prev.map((m) => ({
												id: m.id,
												hasChartData: !!m.chartData,
											}))
										);
										const messageExists = prev.some(
											(m) => m.id === assistantMessageId
										);
										console.log(
											"[CHART FRONTEND] Message exists:",
											messageExists
										);
										if (!messageExists) {
											console.error(
												"[CHART FRONTEND] Message not found! Cannot update chartData"
											);
											return prev;
										}
										const updated = prev.map((msg) =>
											msg.id === assistantMessageId
												? { ...msg, chartData: data.chartData }
												: msg
										);
										const updatedMessage = updated.find(
											(m) => m.id === assistantMessageId
										);
										console.log(
											"[CHART FRONTEND] Updated message chartData:",
											updatedMessage?.chartData ? "PRESENT" : "MISSING"
										);
										if (updatedMessage?.chartData) {
											console.log(
												"[CHART FRONTEND] Chart data structure:",
												Object.keys(updatedMessage.chartData)
											);
										}
										return updated;
									});
								} else {
									console.warn(
										"[CHART FRONTEND] 'data' event received but chartData is missing"
									);
								}
							} else if (data.type === "done") {
								// Update token count and chart data
								assistantTokenCount = data.tokenCount;
								const chartDataFromDone = data.chartData;
								if (chartDataFromDone) {
									assistantChartData = chartDataFromDone;
									console.log(
										"[CHART] Chart data in done event:",
										chartDataFromDone
									);
								}

								setMessages((prev) =>
									prev.map((msg) => {
										if (msg.id === assistantMessageId) {
											// Preserve existing chartData if done event doesn't have it
											const finalChartData =
												chartDataFromDone ||
												assistantChartData ||
												msg.chartData;
											console.log(
												"[CHART DONE] Final chartData:",
												finalChartData ? "PRESENT" : "MISSING"
											);
											return {
												...msg,
												tokenCount: assistantTokenCount,
												chartData: finalChartData,
											};
										}
										return msg;
									})
								);

								// === AUTO-SAVE: Save assistant message ===
								if (conversationId) {
									const saveFilters: {
										subjectId?: number;
										chapterId?: number;
										subjectName?: string;
										chapterTitle?: string;
									} = {};
									if (selectedSubjectId) {
										saveFilters.subjectId = selectedSubjectId;
										saveFilters.subjectName = selectedSubjectName;
									}
									if (selectedChapterId) {
										saveFilters.chapterId = parseInt(selectedChapterId, 10);
										saveFilters.chapterTitle = selectedChapterTitle;
									}

									// Use the tracked chartData
									const finalChartData =
										chartDataFromDone || assistantChartData;

									await saveMessageToConversation(conversationId, {
										role: "assistant",
										content: accumulatedContent,
										sources: assistantSources,
										tokenCount: assistantTokenCount,
										metadata: {
											queryType: metadata.queryType,
											searchMethod: metadata.searchMethod,
											analysisUsed: metadata.analysisUsed,
											filters: saveFilters,
											chartData: finalChartData, // Store chartData in metadata
										},
									});
									// Trigger sidebar refresh to update message count
									setSidebarRefreshTrigger((prev) => prev + 1);
								}
							} else if (data.type === "error") {
								throw new Error(data.error || "Streaming error occurred");
							}
						} catch (parseError) {
							console.error("Error parsing SSE data:", parseError);
						}
					}
				}
			}

			// If no content was received, show error
			if (!accumulatedContent) {
				throw new Error("No response received from server");
			}

			// Auto-save is now handled in the 'done' event to ensure we have all data including chartData
		} catch (error: unknown) {
			console.error("Chat error:", error);
			const errorMessage =
				error instanceof Error ? error.message : "An unexpected error occurred";
			setError(errorMessage);

			const displayMessage = `I apologize, but I encountered an error: ${errorMessage}. Please try again.`;

			// Update the assistant message with error
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantMessageId
						? { ...msg, content: displayMessage }
						: msg
				)
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	const clearChat = () => {
		setMessages([]);
		setError(null);
		setExpandedSources({});
	};

	// Toggle source expansion for a specific message
	const toggleSourceExpansion = (messageId: string) => {
		setExpandedSources((prev) => ({
			...prev,
			[messageId]: !prev[messageId],
		}));
	};

	const formatTimestamp = (timestamp: Date | string | undefined) => {
		if (!timestamp) return "";
		const date = new Date(timestamp);
		return date.toLocaleString();
	};

	// Truncate source title for display
	const truncateTitle = (title: string, maxLength: number = 40) => {
		if (title.length <= maxLength) return title;
		return title.substring(0, maxLength).trim() + "...";
	};

	// Copy message content to clipboard
	const handleCopy = async (text: string, messageId: string) => {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			setCopiedMessageId(messageId);
			setTimeout(() => {
				setCopiedMessageId(null);
			}, 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Sidebar */}
			{/* Sidebar */}
			<div className="w-64 bg-gray-900 border-r border-gray-800 flex-shrink-0 hidden md:block">
				<ConversationList
					isCollapsed={false}
					selectedId={currentConversationId}
					onSelectConversation={loadConversation}
					onNewConversation={startNewConversation}
					refreshTrigger={sidebarRefreshTrigger}
					basePath="/api/dashboard/conversations"
				/>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
				<div className="flex-1 flex flex-col overflow-hidden min-h-0">
					{/* Header */}
					<div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 flex items-center justify-between sticky top-0 z-10">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-primary/10 rounded-lg">
								<Bot className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h2 className="font-semibold text-gray-900 dark:text-gray-100">
									{conversationTitle}
								</h2>
								<div className="flex items-center gap-2 text-xs text-gray-500">
									<span className="flex items-center gap-1">
										<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
										Online
									</span>
									<span>•</span>
									<span>{model}</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={clearChat}
								disabled={messages.length === 0 || isLoading}
								className="hidden sm:flex"
							>
								<MessageSquare className="h-4 w-4 mr-2" />
								New Chat
							</Button>
						</div>
					</div>

					{/* Messages Area */}
					<div
						ref={scrollAreaRef}
						className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth min-h-0"
					>
						{messages.length === 0 ? (
							<div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
								<div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 ring-1 ring-primary/10">
									<Bot className="h-12 w-12 text-primary/80" />
								</div>
								<h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
									How can I help you today?
								</h3>
								<p className="text-gray-500 max-w-md mb-8">
									I can analyze your documents, summarize information, and
									answer questions about your files.
								</p>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
									{[
										"Summarize the latest documents",
										"Find information about...",
										"What are the key points in...",
										"Compare documents related to...",
									].map((suggestion, i) => (
										<button
											key={i}
											onClick={() => {
												setInputMessage(suggestion);
												inputRef.current?.focus();
											}}
											className="p-4 text-left text-sm bg-white dark:bg-gray-800 border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all duration-200 group"
										>
											<span className="text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
												{suggestion}
											</span>
										</button>
									))}
								</div>
							</div>
						) : (
							<div className="space-y-6 pb-4">
								{messages.map((msg) => (
									<div
										key={msg.id}
										className={`flex gap-4 ${msg.role === "assistant" ? "bg-transparent" : ""
											} animate-in slide-in-from-bottom-2 duration-300`}
									>
										<div
											className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === "assistant"
												? "bg-primary text-primary-foreground ring-2 ring-primary/20"
												: "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
												}`}
										>
											{msg.role === "assistant" ? (
												<Bot className="h-5 w-5" />
											) : (
												<User className="h-5 w-5" />
											)}
										</div>
										<div className="flex-1 min-w-0 space-y-2">
											<div className="flex items-center justify-between">
												<span className="font-medium text-sm text-gray-900 dark:text-gray-100">
													{msg.role === "assistant" ? "AI Assistant" : "You"}
												</span>
												<div className="flex items-center gap-2">
													<span className="text-xs text-gray-400">
														{formatTimestamp(msg.timestamp)}
													</span>
													{msg.role === "assistant" && (
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6 text-gray-400 hover:text-gray-600"
															onClick={() => handleCopy(msg.content, msg.id)}
														>
															{copiedMessageId === msg.id ? (
																<Check className="h-3 w-3 text-green-500" />
															) : (
																<Copy className="h-3 w-3" />
															)}
														</Button>
													)}
												</div>
											</div>

											{/* Filters Badge (Assistant Only) */}
											{msg.role === "assistant" && msg.filters && (
												<div className="flex flex-wrap gap-2 mb-2">
													{(msg.filters as any).subjectName && (
														<Badge
															variant="outline"
															className="text-[10px] h-5 px-2 bg-purple-50 text-purple-700 border-purple-200"
														>
															Subject: {(msg.filters as any).subjectName}
														</Badge>
													)}
													{(msg.filters as any).chapterTitle && (
														<Badge
															variant="outline"
															className="text-[10px] h-5 px-2 bg-blue-50 text-blue-700 border-blue-200"
														>
															Chapter: {(msg.filters as any).chapterTitle}
														</Badge>
													)}
												</div>
											)}

											<div
												className={`prose prose-sm max-w-none dark:prose-invert ${msg.role === "user"
													? "bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700"
													: ""
													}`}
											>
												{msg.role === "assistant" ? (
													<>
														{/* Show loading indicator for placeholder and progress messages */}
														{msg.content.includes("Analyzing your question") ||
															msg.content.includes("Generating response") ||
															msg.content.includes("Processing") ||
															msg.content.includes("Synthesizing") ? (
															<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
																<Loader2 className="h-4 w-4 animate-spin" />
																<span>{msg.content}</span>
															</div>
														) : (
															<>
																<ReactMarkdown
																	remarkPlugins={[remarkGfm]}
																	components={{
																		table: ({ node, ...props }) => (
																			<div className="overflow-x-auto my-4 rounded-lg border">
																				<table
																					className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
																					{...props}
																				/>
																			</div>
																		),
																		thead: ({ node, ...props }) => (
																			<thead
																				className="bg-gray-50 dark:bg-gray-800"
																				{...props}
																			/>
																		),
																		th: ({ node, ...props }) => (
																			<th
																				className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
																				{...props}
																			/>
																		),
																		td: ({ node, ...props }) => (
																			<td
																				className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700"
																				{...props}
																			/>
																		),
																		a: ({ node, ...props }) => (
																			<a
																				className="text-primary hover:underline"
																				target="_blank"
																				rel="noopener noreferrer"
																				{...props}
																			/>
																		),
																		p: ({ node, ...props }) => (
																			<p
																				className="mb-2 last:mb-0"
																				{...props}
																			/>
																		),
																		ul: ({ node, ...props }) => (
																			<ul
																				className="list-disc pl-4 mb-2 space-y-1"
																				{...props}
																			/>
																		),
																		ol: ({ node, ...props }) => (
																			<ol
																				className="list-decimal pl-4 mb-2 space-y-1"
																				{...props}
																			/>
																		),
																		li: ({ node, ...props }) => (
																			<li className="pl-1" {...props} />
																		),
																		blockquote: ({ node, ...props }) => (
																			<blockquote
																				className="border-l-4 border-primary/30 pl-4 italic text-gray-600 dark:text-gray-400 my-2"
																				{...props}
																			/>
																		),
																		code: ({ node, ...props }) => (
																			<code
																				className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400"
																				{...props}
																			/>
																		),
																	}}
																>
																	{msg.content}
																</ReactMarkdown>

																{/* Chart Section */}
																{(() => {
																	const hasChartData = !!msg.chartData;
																	console.log(
																		`[CHART RENDER] Message ${msg.id} - hasChartData:`,
																		hasChartData,
																		"chartData:",
																		msg.chartData
																	);
																	return hasChartData ? (
																		<div className="mt-4">
																			<SmartChart
																				config={msg.chartData as any}
																			/>
																		</div>
																	) : null;
																})()}
															</>
														)}
													</>
												) : (
													msg.content
												)}
											</div>

											{/* Sources Section */}
											{msg.sources && msg.sources.length > 0 && (
												<div className="mt-3">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => toggleSourceExpansion(msg.id)}
														className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 h-6 px-2"
													>
														<FileText className="h-3 w-3" />
														{msg.sources.length} Source
														{msg.sources.length !== 1 ? "s" : ""} Used
														{expandedSources[msg.id] ? (
															<span className="text-[10px] ml-1">
																(Click to hide)
															</span>
														) : (
															<span className="text-[10px] ml-1">
																(Click to view)
															</span>
														)}
													</Button>

													{expandedSources[msg.id] && (
														<div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-1 duration-200">
															{msg.sources
																.slice(
																	0,
																	expandedSources[msg.id]
																		? undefined
																		: INITIAL_SOURCES_SHOWN
																)
																.map((source: any, idx: number) => (
																	<Link
																		key={idx}
																		href={`/dashboard/files/${source.id}`}
																		className="block group"
																	>
																		<Card className="h-full hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary cursor-pointer bg-white/50 dark:bg-gray-800/50">
																			<CardContent className="p-3">
																				<div className="flex items-start justify-between gap-2">
																					<div className="flex-1 min-w-0">
																						<p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
																							{truncateTitle(
																								source.title ||
																								"Untitled Document"
																							)}
																						</p>
																						<div className="flex items-center gap-2 mt-1">
																							<Badge
																								variant="secondary"
																								className="text-[10px] h-4 px-1 font-normal bg-gray-100 text-gray-600"
																							>
																								ID: {source.id}
																							</Badge>
																							{source.similarity && (
																								<span className="text-[10px] text-green-600 font-medium">
																									{(
																										source.similarity * 100
																									).toFixed(0)}
																									% match
																								</span>
																							)}
																						</div>
																					</div>
																					<ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
																				</div>
																			</CardContent>
																		</Card>
																	</Link>
																))}
														</div>
													)}
												</div>
											)}

											{/* Token Usage Info (Optional) */}
											{msg.tokenCount && (
												<div className="mt-1 text-[10px] text-gray-400 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
													<span>Input: {msg.tokenCount.input || 0} tokens</span>
													<span>•</span>
													<span>
														Output: {msg.tokenCount.output || 0} tokens
													</span>
												</div>
											)}
										</div>
									</div>
								))}

								{/* Loading Indicator */}
								{isLoading &&
									messages[messages.length - 1]?.role === "user" && (
										<div className="flex gap-4 animate-in fade-in duration-300">
											<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
												<Loader2 className="h-4 w-4 text-primary animate-spin" />
											</div>
											<div className="flex-1 space-y-2">
												<div className="flex items-center gap-2">
													<span className="font-medium text-sm text-gray-900 dark:text-gray-100">
														AI Assistant
													</span>
													<span className="text-xs text-gray-400 animate-pulse">
														Thinking...
													</span>
												</div>
												<div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
											</div>
										</div>
									)}
								<div ref={scrollAreaRef} />
							</div>
						)}
					</div>

					{/* Input Area */}
					<div className="p-4 bg-white dark:bg-gray-900 border-t shadow-lg z-20 flex-shrink-0">
						<div className="max-w-4xl mx-auto space-y-3">
							{/* Filters Row */}
							<div className="flex flex-wrap items-center gap-2">
								<select
									className="text-xs border rounded-md px-2 py-1 bg-gray-50 dark:bg-gray-800 focus:ring-1 focus:ring-primary outline-none"
									value={selectedSubjectId || ""}
									onChange={(e) => {
										const subjectId = e.target.value
											? parseInt(e.target.value, 10)
											: null;
										setSelectedSubjectId(subjectId);
										if (subjectId) {
											const subject = subjects.find((s) => s.id === subjectId);
											setSelectedSubjectName(subject?.name || "");
										} else {
											setSelectedSubjectName("");
										}
										// Clear chapter when subject changes
										setSelectedChapterId(null);
										setSelectedChapterTitle("");
									}}
									disabled={isLoading || subjectsLoading}
								>
									<option value="">All Subjects</option>
									{subjects.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
								</select>

								{selectedSubjectId && (
									<>
										<div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
										<select
											className="text-xs border rounded-md px-2 py-1 bg-gray-50 dark:bg-gray-800 focus:ring-1 focus:ring-primary outline-none"
											value={selectedChapterId || ""}
											onChange={(e) => {
												const chapterId = e.target.value || null;
												setSelectedChapterId(chapterId);
												if (chapterId) {
													const chapter = chapters.find(
														(c) => c.id === chapterId
													);
													setSelectedChapterTitle(chapter?.title || "");
												} else {
													setSelectedChapterTitle("");
												}
											}}
											disabled={isLoading || chaptersLoading}
										>
											<option value="">All Chapters</option>
											{chapters.map((c) => (
												<option key={c.id} value={c.id}>
													{c.chapter_number ? `Ch. ${c.chapter_number}: ` : ""}
													{c.title}
												</option>
											))}
										</select>
									</>
								)}

								<div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

								<select
									className="text-xs border rounded-md px-2 py-1 bg-gray-50 dark:bg-gray-800 focus:ring-1 focus:ring-primary outline-none"
									value={model}
									onChange={(e) => setModel(e.target.value)}
									disabled={isLoading || modelsLoading}
								>
									{models.map((m) => (
										<option key={m.name} value={m.name}>
											{m.label}
										</option>
									))}
								</select>
							</div>

							{/* Input Row */}
							<div className="flex gap-2 relative">
								<Input
									ref={inputRef}
									placeholder={
										isLoading
											? "Please wait for response..."
											: "Ask a question about your documents..."
									}
									value={inputMessage}
									onChange={(e) => setInputMessage(e.target.value)}
									onKeyDown={handleKeyPress}
									disabled={isLoading}
									className="flex-1 pr-12 py-6 text-base shadow-sm focus-visible:ring-primary/50"
								/>
								<Button
									onClick={handleSendMessage}
									disabled={!inputMessage.trim() || isLoading}
									className="absolute right-1.5 top-1.5 h-9 w-9 p-0 rounded-lg shadow-sm"
									size="icon"
								>
									{isLoading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Send className="h-4 w-4" />
									)}
								</Button>
							</div>
							<div className="flex justify-between items-center px-1">
								<p className="text-[10px] text-gray-400">
									AI can make mistakes. Please verify important information from
									source documents.
								</p>
								{messages.length > 0 && (
									<span className="text-[10px] text-gray-400">
										{messages.length} message{messages.length !== 1 ? "s" : ""}
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function DashboardChatPage() {
	return (
		<Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
			<DashboardChatPageContent />
		</Suspense>
	);
}
