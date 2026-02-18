"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
	ChevronRight,
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

export default function DashboardChatPage() {
	return (
		<ChatPageContent />
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

	// Course, Subject and Chapter filters
	const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);
	const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
	const [subjects, setSubjects] = useState<Array<{ id: number; name: string; courseIds?: number[] }>>(
		[]
	);
	const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
	const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
		null
	);
	const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");

	const [chapters, setChapters] = useState<
		Array<{ id: string; title: string; chapter_number: number | null; isLocked?: boolean }>
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

	// Load conversation from URL on mount or redirect to setup
	useEffect(() => {
		if (urlConversationId) {
			const convId = parseInt(urlConversationId);
			if (!isNaN(convId)) {
				loadConversation(convId);
			}
		} else if (!urlSubjectId || !urlChapterId) {
			// No conversation and no context params - redirect to setup
			router.push("/app/chat/setup");
		} else {
			// New Chat with context params - reset state but keep params
			if (currentConversationId !== null) {
				setCurrentConversationId(null);
				setConversationTitle("New AI Tutor");
				setMessages([]);
				setError(null);
				setLastResponseMeta(null);
				setInputMessage("");
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [urlConversationId, urlSubjectId, urlChapterId]);

	// Trigger global sidebar refresh when needed (for new chats or deletions)
	useEffect(() => {
		if (sidebarRefreshTrigger > 0) {
			// Dispatch custom event for UserSidebar to pick up
			window.dispatchEvent(new Event("refresh-conversations"));
		}
	}, [sidebarRefreshTrigger]);

	// Load available subjects
	useEffect(() => {
		async function loadSubjects() {
			try {
				setSubjectsLoading(true);
				const res = await fetch("/api/dashboard/subjects");
				if (!res.ok) throw new Error("Failed to load subjects");
				const data = await res.json();
				const loadedSubjects = data.subjects || [];
				const loadedCourses = data.courses || [];
				setSubjects(loadedSubjects);
				setCourses(loadedCourses);

				// Auto-selection removed - setup page handles context initialization
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

	const filteredSubjects = selectedCourseId === "all"
		? subjects
		: subjects.filter(s => s.courseIds?.includes(parseInt(selectedCourseId)));

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const prevConversationId = useRef<number | null | string>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll logic: Anchor to user question or scroll to bottom on load
	useEffect(() => {
		const scrollContainer = messagesEndRef.current?.parentElement;
		if (!scrollContainer) return;

		// 1. If conversation changed (initial load or switcher), scroll to bottom
		if (prevConversationId.current !== currentConversationId) {
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
			}, 100);
			prevConversationId.current = currentConversationId;
			return;
		}

		// 2. If new messages arrived
		if (messages.length > 0) {
			const lastMessage = messages[messages.length - 1];

			// Check if a new user query was just sent
			// We detect this when the user message is the second to last and assistant is starting or placeholder exists
			const isNewQuery = messages.length >= 2 &&
				messages[messages.length - 2].role === "user" &&
				lastMessage.role === "assistant" &&
				(lastMessage.content.startsWith("Analyzing") ||
					lastMessage.content.startsWith("Processing"));

			if (isNewQuery) {
				// Find the last user message element and scroll it to the top of the container
				// Gemini behavior: Anchor the question at the top
				const userMsgElements = document.querySelectorAll('[data-role="user"]');
				const lastUserMsg = userMsgElements[userMsgElements.length - 1];
				if (lastUserMsg) {
					// Small delay to allow the bottom spacer and AI placeholder to render
					setTimeout(() => {
						lastUserMsg.scrollIntoView({ behavior: "smooth", block: "start" });
					}, 100);
				}
			}
			// 3. While streaming: DO NOTHING. This allows the user to read at their own pace.
			// The old aggressive scroll to bottom is removed to match Gemini's UX.
		}
	}, [messages, currentConversationId, isLoading]);

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
		return title || "New AI Tutor";
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
				(msg: any) => {
					const baseMessage = {
						id: msg.id.toString(),
						role: msg.role,
						content: msg.content,
						timestamp: new Date(msg.timestamp),
						sources: msg.sources || [],
						tokenCount: msg.tokenCount,
						chartData: msg.metadata?.chartData || null,
						filters:
							msg.role === "assistant" ? msg.metadata?.filters || {} : undefined,
						imageUrl: msg.metadata?.imageUrl,
						imageAlt: msg.metadata?.imageAlt,
						imageLimitReached: msg.metadata?.imageLimitReached,
					};
					// Parse suggested responses from assistant messages
					if (msg.role === "assistant" && msg.content) {
						const { cleanedContent, suggestedResponses } = parseSuggestedResponses(msg.content);
						return { ...baseMessage, content: cleanedContent, suggestedResponses };
					}
					return baseMessage;
				}
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

			// toast.success(`Loaded: ${conversation.title}`);
		} catch (error) {
			console.error("Error loading conversation:", error);
			toast.error("Failed to load conversation");
		}
	};

	// Start a new conversation (clear messages, reset state)
	const startNewConversation = () => {
		setCurrentConversationId(null);
		setConversationTitle("New AI Tutor");
		setMessages([]);
		setError(null);
		setLastResponseMeta(null);
		setInputMessage("");

		// Redirect to setup page for context selection
		router.push("/app/chat/setup");

		toast.success("Started new AI Tutor");
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
			let assistantImageUrl: string | null = null;
			let assistantImageAlt: string | null = null;
			let assistantImageLimitReached: boolean = false;

			if (!reader) {
				throw new Error("Failed to get response reader");
			}

			let pendingLine = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = (pendingLine + chunk).split("\n");
				pendingLine = lines.pop() ?? "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const payload = line.slice(6).trim();
							if (!payload || payload === "[DONE]") {
								continue;
							}
							const data = JSON.parse(payload);

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
							} else if (data.type === "image_generating") {
								// Show loading state for image generation
								console.log("[IMAGE] Generating image...");
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, imageGenerating: true }
											: msg
									)
								);
							} else if (data.type === "image") {
								// Image generated successfully
								console.log("[IMAGE] Image received:", data.url);
								assistantImageUrl = data.url;
								assistantImageAlt = data.alt;

								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? {
												...msg,
												imageUrl: data.url,
												imageAlt: data.alt,
												imageGenerating: false
											}
											: msg
									)
								);
								toast.success(`Image generated! (${data.remaining} remaining today)`);
							} else if (data.type === "image_error") {
								// Image generation failed
								console.error("[IMAGE] Error:", data.error);
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, imageGenerating: false }
											: msg
									)
								);
								toast.error(data.error || "Failed to generate image");
							} else if (data.type === "image_limit_reached") {
								// Daily limit reached
								console.log("[IMAGE] Limit reached:", data.message);
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, imageLimitReached: true, imageGenerating: false }
											: msg
									)
								);
								toast.warning(data.message);
							} else if (data.type === "error") {
								throw new Error(data.error || "Streaming error occurred");
							}
						} catch (parseError) {
							console.error("Error parsing SSE data:", parseError, line);
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
						imageUrl: assistantImageUrl,
						imageAlt: assistantImageAlt,
						imageLimitReached: assistantImageLimitReached,
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
		<div className="flex h-[calc(100vh-4rem)] lg:h-screen overflow-hidden -mb-16 lg:mb-0 pb-4">
			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50 h-full">
				<div className="flex-1 flex flex-col overflow-hidden min-h-0">
					{/* Header */}
					<div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-3 flex flex-col gap-2 sticky top-0 z-10">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Bot className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h1 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
										{conversationTitle}
									</h1>
									<div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
										<span className="flex items-center gap-1">
											<div className="w-1.5 h-1.5 rounded-full bg-green-500" />
											Active
										</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => router.push("/app/chat/setup")}
									className="h-8 text-xs font-bold text-muted-foreground hover:text-primary px-2"
								>
									<MessageSquare className="w-3.5 h-3.5 mr-1" />
									New Chat
								</Button>
							</div>
						</div>

						{/* Compact Context Header */}
						{(selectedSubjectName || selectedChapterTitle) && (
							<div className="flex items-center gap-2 px-1 border-t pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
								<div className="flex flex-wrap items-center gap-1.5 text-xs">
									<Badge variant="secondary" className="bg-slate-100 hover:bg-slate-100 text-slate-600 font-semibold rounded-md border-none px-2 py-0.5">
										{selectedSubjectName || "Loading..."}
									</Badge>
									<ChevronRight className="w-3 h-3 text-slate-300" />
									<Badge variant="outline" className="text-slate-500 font-medium rounded-md px-2 py-0.5 border-slate-200 truncate max-w-[150px] sm:max-w-none">
										{selectedChapterTitle || "Loading..."}
									</Badge>
								</div>
								<div className="ml-auto">
									{!currentConversationId && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => router.push("/app/chat/setup")}
											className="h-6 text-[10px] uppercase tracking-tighter font-bold text-primary hover:bg-primary/5 p-0 px-1"
										>
											Change
										</Button>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Messages Area */}
					<div className={`flex-1 overflow-y-auto p-4 space-y-6 ${messages.length === 0 ? 'flex flex-col justify-center' : ''}`}>
						{messages.length === 0 ? (
							<div className="flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
								<div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
									<Bot className="w-12 h-12 text-primary/80" />
								</div>
								<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
									How can I help you today?
								</h2>
								<p className="text-muted-foreground max-w-md mb-4 leading-relaxed">
									I'm your AI tutor. I can help you understand chapters, explain complex topics, and create visual diagrams for better learning.
								</p>

								{/* Note replacing suggestion cards */}
								<div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl px-6 py-4 max-w-md mb-8">
									<p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
										💡 Ask me anything about the chapter in your preferred language
									</p>
								</div>

								{/* Inline Input Area for empty state */}
								<div className="w-full max-w-2xl mx-auto space-y-2">
									<div className="relative flex items-end gap-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-1.5">
										<div className="flex-1">
											<Textarea
												ref={(el: HTMLTextAreaElement | null) => {
													if (el) {
														inputRef.current = el as unknown as HTMLInputElement;
														el.style.height = "auto";
														el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
													}
												}}
												value={inputMessage}
												onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
													setInputMessage(e.target.value);
													const target = e.target as HTMLTextAreaElement;
													target.style.height = "auto";
													target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
												}}
												onKeyDown={handleKeyPress}
												placeholder={
													selectedChapterId
														? `Ask about ${truncateTitle(selectedChapterTitle, 30)}...`
														: "Select a chapter to start chatting..."
												}
												className="border-0 focus-visible:ring-0 px-2 py-2 min-h-[50px] max-h-32 resize-none bg-transparent shadow-none"
												disabled={isLoading || !selectedChapterId}
												rows={2}
											/>
										</div>
										<Button
											onClick={() => handleSendMessage()}
											disabled={isLoading || !inputMessage.trim() || !selectedChapterId}
											size="icon"
											className={`h-10 w-10 rounded-lg transition-all duration-200 mb-0.5 ${inputMessage.trim() && !isLoading && selectedChapterId
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
									<p className="text-[10px] text-muted-foreground text-center px-4">
										AI can make mistakes. Please verify important information.
									</p>
								</div>
							</div>
						) : (
							<div className="space-y-6 max-w-4xl mx-auto pb-4">
								{messages.map((msg) => (
									<div
										key={msg.id}
										data-role={msg.role}
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

														{/* Generated Image Display */}
														{msg.imageGenerating && (
															<div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-3">
																<Loader2 className="w-5 h-5 animate-spin text-primary" />
																<span className="text-sm text-muted-foreground">Generating educational diagram...</span>
															</div>
														)}
														{msg.imageUrl && (
															<div className="mt-4">
																<img
																	src={msg.imageUrl}
																	alt={msg.imageAlt || "Generated educational diagram"}
																	className="max-w-full rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
																	loading="lazy"
																/>
																<p className="text-xs text-muted-foreground mt-1 italic">
																	AI-generated educational diagram
																</p>
															</div>
														)}
														{msg.imageLimitReached && !msg.imageUrl && (
															<div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
																⚠️ Daily image limit reached. Your limit will reset tomorrow.
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
										</div>
									</div>
								))}
								{/* Dynamic Spacer to allow scroll-to-top for last user question */}
								{isLoading && <div className="h-[60vh] w-full pointer-events-none" />}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>

					{/* Input Area - Only show at bottom when there are messages */}
					{messages.length > 0 && (
						<div className="border-t bg-white dark:bg-gray-900 px-3 pt-3 pb-2">
							<div className="w-full max-w-4xl mx-auto space-y-1">
								<div className="relative flex items-end gap-2 bg-white dark:bg-gray-800 border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-1.5">
									<div className="flex-1">
										<Textarea
											ref={(el: HTMLTextAreaElement | null) => {
												// Combined ref for internal use and auto-resize
												if (el) {
													inputRef.current = el as unknown as HTMLInputElement; // Type casting for compatibility
													// Auto-resize logic on mount/ref update
													el.style.height = "auto";
													el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
												}
											}}
											value={inputMessage}
											onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
												setInputMessage(e.target.value);
												// Auto-resize on change
												const target = e.target as HTMLTextAreaElement;
												target.style.height = "auto";
												target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
											}}
											onKeyDown={handleKeyPress}
											placeholder={
												selectedChapterId
													? `Ask about ${truncateTitle(
														selectedChapterTitle,
														30
													)}...`
													: "Select a chapter to start chatting..."
											}
											className="border-0 focus-visible:ring-0 px-2.5 py-2 min-h-[50px] max-h-32 resize-none bg-transparent shadow-none"
											disabled={isLoading || !selectedChapterId}
											rows={2} // Default to 2 lines height
										/>
									</div>
									<Button
										onClick={() => handleSendMessage()}
										disabled={
											isLoading || !inputMessage.trim() || !selectedChapterId
										}
										size="icon"
										className={`h-10 w-10 rounded-lg transition-all duration-200 mb-0.5 ${inputMessage.trim() && !isLoading && selectedChapterId
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
								<div className="flex justify-between items-center px-4">
									<p className="text-[10px] text-muted-foreground">
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
					)}
				</div>
			</div>
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

	// Remove [GENERATE_IMAGE: ...] patterns from display (images are shown separately)
	cleanedContent = cleanedContent.replace(/\[GENERATE_IMAGE:[^\]]+\]/gi, '').trim();

	return { cleanedContent, suggestedResponses };
}
