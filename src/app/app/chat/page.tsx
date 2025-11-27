"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	Send,
	Bot,
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
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { SmartChart } from "@/components/dashboard/SmartChart";
import { ResponseTranslator } from "@/components/chat/ResponseTranslator";
import { translateContent } from "./actions";
import {
	SplitScreenProvider,
	useSplitScreen,
} from "@/components/split-screen/SplitScreenContext";
import { SplitScreenLayout } from "@/components/split-screen/SplitScreenLayout";
import { GraduationCap } from "lucide-react";



export default function DashboardChatPage() {
	return (
		<SplitScreenProvider>
			<ChatPageContent />
		</SplitScreenProvider>
	);
}

function ChatPageContent() {
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

	// Model selection removed - using backend default

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

	// Get conversation ID and filters from URL
	const searchParams = useSearchParams();
	const router = useRouter();
	const urlConversationId = searchParams.get("id");
	const urlSubjectId = searchParams.get("subjectId");
	const urlChapterId = searchParams.get("chapterId");

	// Load conversation from URL on mount
	useEffect(() => {
		if (urlConversationId) {
			const convId = parseInt(urlConversationId);
			if (!isNaN(convId)) {
				loadConversation(convId);
			}
		}
	}, [urlConversationId]);

	// Load available subjects
	useEffect(() => {
		async function loadSubjects() {
			try {
				setSubjectsLoading(true);
				const res = await fetch("/api/dashboard/subjects");
				if (!res.ok) throw new Error("Failed to load subjects");
				const data = await res.json();
				const loadedSubjects = data.subjects || [];
				setSubjects(loadedSubjects);

				// Auto-select first subject if none selected and not loading from URL
				if (loadedSubjects.length > 0 && !urlSubjectId && !selectedSubjectId) {
					setSelectedSubjectId(loadedSubjects[0].id);
					setSelectedSubjectName(loadedSubjects[0].name);
				}
			} catch (e) {
				console.error("[Chat] Failed to fetch subjects", e);
				setSubjects([]);
			} finally {
				setSubjectsLoading(false);
			}
		}
		loadSubjects();
	}, []); // Run once on mount

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
				const loadedChapters = data.chapters || [];
				setChapters(loadedChapters);

				// If URL has chapterId, preselect it
				if (urlChapterId && loadedChapters.length > 0) {
					const chapter = loadedChapters.find((c: any) => c.id === urlChapterId);
					if (chapter) {
						setSelectedChapterId(chapter.id);
						setSelectedChapterTitle(chapter.title);
						return; // Exit early if URL chapter found
					}
				}

				// Auto-select first chapter if available
				if (loadedChapters.length > 0) {
					setSelectedChapterId(loadedChapters[0].id);
					setSelectedChapterTitle(loadedChapters[0].title);
				} else {
					// Reset if no chapters found
					setSelectedChapterId(null);
					setSelectedChapterTitle("");
				}
			} catch (e) {
				console.error("[Chat] Failed to fetch chapters", e);
				setChapters([]);
			} finally {
				setChaptersLoading(false);
			}
		}
		loadChapters();
	}, [selectedSubjectId, urlChapterId]); // Re-run when subject changes

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

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll to bottom when new messages arrive
	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		const scrollContainer = messagesEndRef.current?.parentElement;
		if (!scrollContainer) return;

		// Check if user is near bottom (within 100px)
		const isNearBottom =
			scrollContainer.scrollHeight -
			scrollContainer.scrollTop -
			scrollContainer.clientHeight <
			100;

		// Always scroll if it's a new message (length changed) or if we're already near bottom
		// Use 'auto' (instant) behavior to prevent bouncing during streaming
		if (isNearBottom) {
			messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
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
				body: JSON.stringify({
					title,
					subjectId: selectedSubjectId,
					chapterId: selectedChapterId
				}),
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
			chartData?: any;
			metadata?: any;
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

			// Set context from conversation if available
			if (conversation.subjectId) {
				setSelectedSubjectId(conversation.subjectId);
				// We'll need to find the name from the subjects list
				const subj = subjects.find(s => s.id === conversation.subjectId);
				if (subj) setSelectedSubjectName(subj.name);
			}

			if (conversation.chapterId) {
				setSelectedChapterId(conversation.chapterId);
				// We'll need to fetch chapters or find title if already loaded
				// Ideally we should fetch the chapter details if not in list
			}

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

			// Restore filters from the last message that has them
			const lastMessageWithFilters = [...loadedMessages]
				.reverse()
				.find((msg) => msg.filters?.subjectId || msg.filters?.chapterId);

			if (lastMessageWithFilters?.filters) {
				const { subjectId, chapterId } = lastMessageWithFilters.filters;

				if (subjectId) {
					setSelectedSubjectId(subjectId);
					// Find subject name from subjects list
					const subject = subjects.find(s => s.id === subjectId);
					if (subject) setSelectedSubjectName(subject.name);
				}

				if (chapterId) {
					setSelectedChapterId(chapterId.toString());
					// Find chapter title from chapters list
					const chapter = chapters.find(c => c.id === chapterId.toString());
					if (chapter) setSelectedChapterTitle(chapter.title);
				}

				// Update URL to reflect restored filters
				const params = new URLSearchParams();
				params.set("id", conversation.id.toString());
				if (subjectId) params.set("subjectId", subjectId.toString());
				if (chapterId) params.set("chapterId", chapterId.toString());
				router.push(`?${params.toString()}`);
			}

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

		// Clear URL params
		router.push("/app/chat");

		toast.success("Started new conversation");
	};

	// === END CONVERSATION MANAGEMENT ===

	const handleSendMessage = async (content?: string) => {
		const messageToSend = typeof content === "string" ? content : inputMessage;
		if (!messageToSend.trim() || isLoading) return;

		// Validation: Ensure chapter is selected
		if (!selectedChapterId) {
			toast.error("Please select a chapter to start chatting.");
			return;
		}

		const userMessage: ChatMessage = {
			id: `user_${Date.now()}`,
			role: "user",
			content: messageToSend.trim(),
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
					// Model selection removed - backend will use default
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
								if (data.chartData) {
									assistantChartData = data.chartData;
									console.log(
										"[CHART FRONTEND] Chart data present, updating message:",
										assistantMessageId
									);
									setMessages((prev) => {
										const messageExists = prev.some(
											(m) => m.id === assistantMessageId
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
										console.log(
											"[CHART FRONTEND] Updated message chartData:",
											updated.find((m) => m.id === assistantMessageId)
												?.chartData
												? "PRESENT"
												: "MISSING"
										);
										return updated;
									});
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
							} else if (data.type === "error") {
								throw new Error(data.error || "Streaming error occurred");
							}
						} catch (parseError) {
							console.error("Error parsing SSE data:", parseError);
						}
					}
				}
			}

			// Parse suggested responses from the final content
			const { cleanedContent, suggestedResponses } = parseSuggestedResponses(accumulatedContent);
			accumulatedContent = cleanedContent;

			console.log('[CHAT] Parsed suggested responses:', suggestedResponses);

			// Update the message one last time with cleaned content and suggested responses
			setMessages((prev) =>
				prev.map((msg) => {
					if (msg.id === assistantMessageId) {
						return {
							...msg,
							content: cleanedContent,
							suggestedResponses: suggestedResponses,
						};
					}
					return msg;
				})
			);

			// If no content was received, show error
			if (!accumulatedContent) {
				throw new Error("No response received from server");
			}

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
						chartData: assistantChartData, // Store chartData in metadata
					},
				});
				// Trigger sidebar refresh to update message count
				setSidebarRefreshTrigger((prev) => prev + 1);
			}
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

	const { openCitation } = useSplitScreen();

	return (
		<div className="flex h-full overflow-hidden">
			<SplitScreenLayout>
				{/* Main Chat Area */}
				<div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50 h-full">
					<div className="flex-1 flex flex-col overflow-hidden min-h-0">
						{/* Header */}
						<div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 flex items-center justify-between sticky top-0 z-10">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Bot className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
										{conversationTitle}
									</h1>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<span className="flex items-center gap-1">
											<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
											Online
										</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={startNewConversation}
									className="text-muted-foreground hover:text-primary"
								>
									<MessageSquare className="w-4 h-4 mr-2" />
									New Chat
								</Button>
							</div>
						</div>

						{/* Messages Area */}
						<div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
							{messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
									<div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
										<Bot className="w-12 h-12 text-primary/80" />
									</div>
									<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
										How can I help you today?
									</h2>
									<p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
										I can analyze your documents, summarize information, and
										answer questions about your files.
									</p>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
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
												className="p-4 text-sm text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
											>
												<span className="text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">
													{suggestion}
												</span>
											</button>
										))}
									</div>
								</div>
							) : (
								<div className="space-y-6 max-w-4xl mx-auto pb-4">
									{messages.map((msg) => (
										<div
											key={msg.id}
											className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"
												} animate-in fade-in slide-in-from-bottom-4 duration-500`}
										>
											{msg.role === "assistant" && (
												<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
													<Bot className="w-5 h-5 text-primary" />
												</div>
											)}

											<div
												className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"
													}`}
											>
												<div
													className={`rounded-2xl p-4 shadow-sm ${msg.role === "user"
														? "bg-primary text-primary-foreground rounded-tr-none"
														: "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-none"
														}`}
												>
													{msg.role === "assistant" ? (
														<div className="prose prose-sm dark:prose-invert max-w-none">
															<ReactMarkdown
																remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
																rehypePlugins={[rehypeKatex]}
																components={{
																	code({
																		node,
																		inline,
																		className,
																		children,
																		...props
																	}: any) {
																		return !inline ? (
																			<div className="relative group rounded-md overflow-hidden my-2">
																				<div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6 bg-gray-800/50 hover:bg-gray-800 text-white"
																						onClick={() =>
																							handleCopy(
																								String(children),
																								`code-${msg.id}`
																							)
																						}
																					>
																						{copiedMessageId ===
																							`code-${msg.id}` ? (
																							<Check className="h-3 w-3" />
																						) : (
																							<Copy className="h-3 w-3" />
																						)}
																					</Button>
																				</div>
																				<pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
																					<code {...props}>{children}</code>
																				</pre>
																			</div>
																		) : (
																			<code
																				className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary"
																				{...props}
																			>
																				{children}
																			</code>
																		);
																	},
																	table({ children }) {
																		return (
																			<div className="overflow-x-auto my-4 border rounded-lg">
																				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
																					{children}
																				</table>
																			</div>
																		);
																	},
																	th({ children }) {
																		return (
																			<th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
																				{children}
																			</th>
																		);
																	},
																	td({ children }) {
																		return (
																			<td className="px-4 py-3 whitespace-nowrap text-sm border-t border-gray-100 dark:border-gray-700">
																				{children}
																			</td>
																		);
																	},
																	p({ children }) {
																		return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
																	},
																	ul({ children }) {
																		return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
																	},
																	ol({ children }) {
																		return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
																	},
																	li({ children }) {
																		return <li className="leading-relaxed">{children}</li>;
																	},
																	h1({ children }) {
																		return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>;
																	},
																	h2({ children }) {
																		return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
																	},
																	h3({ children }) {
																		return <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>;
																	},
																	blockquote({ children }) {
																		return <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground">{children}</blockquote>;
																	},
																}}
															>
																{msg.content.replace(
																	/```json\s*({[\s\S]*"related_questions"[\s\S]*})\s*```/g,
																	""
																)}
															</ReactMarkdown>

															{/* Render Chart if chartData is present */}
															{msg.chartData && (
																<div className="mt-4 w-full h-64 md:h-80 lg:h-96">
																	<SmartChart
																		config={msg.chartData}
																	/>
																</div>
															)}

															<ResponseTranslator
																originalText={msg.originalContent || msg.content}
																translatedText={msg.originalContent ? msg.content : undefined}
																onTranslationComplete={(translatedText) => {
																	setMessages((prev) =>
																		prev.map((m) => {
																			if (m.id === msg.id) {
																				return {
																					...m,
																					content: translatedText,
																					originalContent: m.originalContent || m.content,
																				};
																			}
																			return m;
																		})
																	);
																}}
																onRevert={() => {
																	if (msg.originalContent) {
																		setMessages((prev) =>
																			prev.map((m) => {
																				if (m.id === msg.id) {
																					return {
																						...m,
																						content: m.originalContent!,
																						originalContent: undefined,
																					};
																				}
																				return m;
																			})
																		);
																	}
																}}
															/>
														</div>
													) : (
														<p className="whitespace-pre-wrap text-sm">
															{msg.content.replace(
																/```json\s*({[\s\S]*"related_questions"[\s\S]*})\s*```/,
																""
															)}
														</p>
													)}
												</div>

												{/* Message Footer (Timestamp, Sources, Token Count) */}
												<div className="flex items-center gap-2 mt-1 px-1">
													<span className="text-[10px] text-muted-foreground">
														{formatTimestamp(msg.timestamp)}
													</span>

													{msg.role === "assistant" && (
														<div className="flex items-center gap-2">
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 text-muted-foreground hover:text-primary"
																onClick={() =>
																	handleCopy(msg.content, msg.id)
																}
															>
																{copiedMessageId === msg.id ? (
																	<Check className="h-3 w-3" />
																) : (
																	<Copy className="h-3 w-3" />
																)}
															</Button>

															{msg.tokenCount && (
																<span className="text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
																	{msg.tokenCount.input + msg.tokenCount.output}{" "}
																	tokens
																</span>
															)}
														</div>
													)}
													{/* Suggested Questions */}
													{(() => {
														const jsonMatch = msg.content.match(
															/```json\s*({[\s\S]*"related_questions"[\s\S]*})\s*```/
														);
														if (jsonMatch) {
															try {
																const data = JSON.parse(jsonMatch[1]);
																if (
																	data.related_questions &&
																	Array.isArray(data.related_questions)
																) {
																	return (
																		<div className="mt-3 flex flex-wrap gap-2">
																			{data.related_questions.map(
																				(q: string, i: number) => (
																					<button
																						key={i}
																						onClick={() => {
																							setInputMessage(q);
																							// Optional: Auto-send
																							// handleSendMessage();
																						}}
																						className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors text-left"
																					>
																						{q}
																					</button>
																				)
																			)}
																		</div>
																	);
																}
															} catch (e) {
																// Ignore parsing errors
															}
														}
														return null;
													})()}
												</div>

												{/* Suggested Responses (Tutor Mode) */}
												{msg.suggestedResponses && msg.suggestedResponses.length > 0 && (
													<div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
														{msg.suggestedResponses.map((response, i) => (
															<Button
																key={i}
																variant="outline"
																size="sm"
																onClick={() => handleSendMessage(response)}
																className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary rounded-full"
															>
																{response}
															</Button>
														))}
													</div>
												)}

												{/* Sources Section */}
												{msg.sources && msg.sources.length > 0 && (
													<div className="mt-2 w-full max-w-2xl animate-in fade-in slide-in-from-top-2 duration-300">
														<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
															<button
																onClick={() => toggleSourceExpansion(msg.id)}
																className="w-full flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
															>
																<div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
																	<FileText className="w-4 h-4 text-primary" />
																	<span>
																		Sources ({msg.sources.length})
																	</span>
																</div>
																<div className="text-xs text-muted-foreground">
																	{expandedSources[msg.id]
																		? "Hide"
																		: "Show"}
																</div>
															</button>

															{expandedSources[msg.id] && (
																<div className="p-3 grid gap-2 bg-white dark:bg-gray-800">
																	{msg.sources.map((source: any) => (
																		<div
																			key={source.id}
																			className="group flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 cursor-pointer"
																			onClick={() => {
																				// Use citation data if available, otherwise fallback
																				const citation = source.citation || {};
																				openCitation({
																					pageNumber:
																						citation.pageNumber ||
																						source.page_number ||
																						1,
																					imageUrl:
																						citation.imageUrl ||
																						source.image_url,
																					boundingBox:
																						citation.boundingBox ||
																						source.bbox,
																					chapterId:
																						msg.filters?.chapterId, // Pass chapterId from message filters
																				});
																			}}
																		>
																			<div className="mt-1 p-1.5 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
																				<FileText className="w-3.5 h-3.5 text-primary" />
																			</div>
																			<div className="flex-1 min-w-0">
																				<div className="flex items-center justify-between gap-2">
																					<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
																						{source.title}
																					</p>
																					{source.similarity && (
																						<Badge
																							variant="secondary"
																							className="text-[10px] h-5 px-1.5"
																						>
																							{Math.round(
																								source.similarity * 100
																							)}
																							% match
																						</Badge>
																					)}
																				</div>
																				{source.citation?.pageNumber && (
																					<p className="text-xs text-muted-foreground mt-0.5">
																						Page {source.citation.pageNumber}
																					</p>
																				)}
																			</div>
																			<ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
																		</div>
																	))}
																</div>
															)}
														</div>
													</div>
												)}
											</div>
										</div>
									))}
									<div ref={messagesEndRef} />
								</div>
							)}
						</div>

						{/* Input Area */}
						<div className="border-t bg-white dark:bg-gray-900 p-4">
							<div className="max-w-4xl mx-auto space-y-4">
								{/* Filters */}
								<div className="flex flex-wrap items-center gap-3">
									{currentConversationId && (
										<div className="w-full text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 mb-1 flex items-center gap-1">
											<span>🔒 Context locked to this conversation. Start a new chat to change.</span>
										</div>
									)}
									<select
										className="h-9 text-sm border rounded-md px-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
										value={selectedSubjectId || ""}

										onChange={(e) => {
											const val = e.target.value;
											if (val) {
												const id = parseInt(val);
												setSelectedSubjectId(id);
												const subj = subjects.find((s) => s.id === id);
												if (subj) setSelectedSubjectName(subj.name);

												// Update URL
												const params = new URLSearchParams(searchParams.toString());
												params.set("subjectId", val);
												params.delete("chapterId"); // Reset chapter when subject changes
												router.push(`?${params.toString()}`);
											}
											// No "All Subjects" option allowed
										}}
										disabled={subjectsLoading || !!currentConversationId}
									>
										{subjects.map((s) => (
											<option key={s.id} value={s.id}>
												{s.name}
											</option>
										))}
									</select>

									<select
										className="h-9 text-sm border rounded-md px-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/20 outline-none max-w-[200px]"
										value={selectedChapterId || ""}
										onChange={(e) => {
											const val = e.target.value;
											if (val) {
												setSelectedChapterId(val);
												const chap = chapters.find((c) => c.id === val);
												if (chap) setSelectedChapterTitle(chap.title);

												// Update URL
												const params = new URLSearchParams(searchParams.toString());
												params.set("chapterId", val);
												router.push(`?${params.toString()}`);
											}
										}}
										disabled={chaptersLoading || !selectedSubjectId || !!currentConversationId}
									>
										{chapters.length === 0 ? (
											<option value="" disabled>
												No chapters found
											</option>
										) : (
											chapters.map((c) => (
												<option key={c.id} value={c.id}>
													{c.chapter_number ? `${c.chapter_number}. ` : ""}
													{c.title}
												</option>
											))
										)}
									</select>
								</div>

								{/* Input Box */}
								<div className="relative flex items-end gap-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-2">
									<div className="flex-1">
										<Input
											ref={inputRef}
											value={inputMessage}
											onChange={(e) => setInputMessage(e.target.value)}
											onKeyDown={handleKeyPress}
											placeholder={
												selectedChapterId
													? `Ask about ${truncateTitle(
														selectedChapterTitle,
														30
													)}...`
													: "Select a chapter to start chatting..."
											}
											className="border-0 focus-visible:ring-0 px-3 py-2 h-auto max-h-32 min-h-[44px] resize-none bg-transparent"
											disabled={isLoading || !selectedChapterId}
										/>
									</div>
									<Button
										onClick={() => handleSendMessage()}
										disabled={
											isLoading || !inputMessage.trim() || !selectedChapterId
										}
										size="icon"
										className={`h-10 w-10 rounded-lg transition-all duration-200 ${inputMessage.trim() && !isLoading && selectedChapterId
											? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg scale-100"
											: "bg-gray-100 text-gray-400 scale-95"
											}`}
									>
										{isLoading ? (
											<Loader2 className="h-5 w-5 animate-spin" />
										) : (
											<Send className="h-5 w-5" />
										)}
									</Button>
								</div>
								<div className="flex justify-between items-center px-1">
									<p className="text-xs text-muted-foreground">
										AI can make mistakes. Please verify important information.
									</p>
									{lastResponseMeta && (
										<Badge
											variant="outline"
											className="text-[10px] h-5 font-normal text-muted-foreground"
										>
											{lastResponseMeta.queryType === "analytical_query"
												? "Deep Analysis"
												: "Quick Search"}
										</Badge>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</SplitScreenLayout>
		</div>
	);
}

function parseSuggestedResponses(content: string): { cleanedContent: string; suggestedResponses: string[] } {
	let suggestedResponses: string[] = [];
	let cleanedContent = content;

	// Try multiple regex patterns to match the JSON block
	const patterns = [
		/```json\s*(\{[\s\S]*?"suggested_responses"[\s\S]*?\})\s*```/,  // Standard: ```json
		/```\s*(\{[\s\S]*?"suggested_responses"[\s\S]*?\})\s*```/,      // No language: ```
		/``json\s*(\{[\s\S]*?"suggested_responses"[\s\S]*?\})\s*``/,    // Malformed: ``json
		/\{[\s\S]*?"suggested_responses"[\s\S]*?\}/                      // Raw JSON (no backticks)
	];

	let jsonMatch: RegExpMatchArray | null = null;
	let matchedPattern = -1;

	for (let i = 0; i < patterns.length; i++) {
		jsonMatch = content.match(patterns[i]);
		if (jsonMatch) {
			matchedPattern = i;
			break;
		}
	}

	if (jsonMatch) {
		// Always remove the matched block from content (whether we can parse it or not)
		cleanedContent = content.replace(jsonMatch[0], "").trim();

		try {
			// For the raw JSON pattern (no backticks), use full match, otherwise use capture group
			let jsonString = matchedPattern === 3 ? jsonMatch[0] : jsonMatch[1];
			jsonString = jsonString.trim();

			// Find complete JSON object
			let braceCount = 0;
			let endIndex = -1;
			for (let i = 0; i < jsonString.length; i++) {
				if (jsonString[i] === '{') braceCount++;
				if (jsonString[i] === '}') {
					braceCount--;
					if (braceCount === 0) {
						endIndex = i + 1;
						break;
					}
				}
			}

			if (endIndex > 0) {
				jsonString = jsonString.substring(0, endIndex);
			}

			const json = JSON.parse(jsonString);
			if (json.suggested_responses && Array.isArray(json.suggested_responses)) {
				suggestedResponses = json.suggested_responses;
			}
		} catch (e) {
			console.error("[PARSE] Failed to parse suggested_responses, but removed from display:", e);
		}
	}

	return { cleanedContent, suggestedResponses };
}
