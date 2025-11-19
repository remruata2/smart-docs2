"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Loader2,
	Send,
	Bot,
	User,
	FileText,
	AlertCircle,
	MessageSquare,
	ExternalLink,
	Copy,
	Check,
	FileDown,
} from "lucide-react";
// PDF generation removed - using text export instead
import { toast } from "sonner";
import { ChatMessage } from "@/lib/ai-service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ConversationSidebar from "@/components/ConversationSidebar";

interface ChatSource {
	id: number;
	title: string;
}



export default function AdminChatPage() {
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
	const [categories, setCategories] = useState<string[]>([]);
	const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
	const [selectedCategory, setSelectedCategory] = useState<string>("");

	// Load available models for current provider
	useEffect(() => {
		let cancelled = false;
		async function loadModels() {
			try {
				setModelsLoading(true);
				const res = await fetch(`/api/admin/ai/models?provider=gemini`);
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
				console.error("[AdminChat] Failed to fetch models", e);
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

	// Load available categories
	useEffect(() => {
		async function loadCategories() {
			try {
				setCategoriesLoading(true);
				const res = await fetch("/api/admin/categories");
				if (!res.ok) throw new Error("Failed to load categories");
				const data = await res.json();
				setCategories(data.categories || []);
				// Reset selected category if it's not in the new list
				if (selectedCategory && !data.categories?.includes(selectedCategory)) {
					setSelectedCategory("");
				}
			} catch (e) {
				console.error("[AdminChat] Failed to fetch categories", e);
				setCategories([]);
			} finally {
				setCategoriesLoading(false);
			}
		}
		loadCategories();
	}, []);

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

			const response = await fetch("/api/admin/conversations", {
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
		}
	) => {
		try {
			const response = await fetch(
				`/api/admin/conversations/${conversationId}/messages`,
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
	const generateConversationTitle = async (conversationId: number) => {
		try {
			const response = await fetch(
				`/api/admin/conversations/${conversationId}/generate-title`,
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
				`/api/admin/conversations/${conversationId}`
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
					// For assistant messages, always show filters (default to "All" if not saved)
					filters:
						msg.role === "assistant"
							? msg.metadata?.filters || {
									category: "All Categories",
							  }
							: undefined,
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

		// Always include filters (show "All Districts" / "All Categories" if not selected)
		const activeFilters: { category: string } = {
			category: selectedCategory || "All Categories",
		};

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
			const response = await fetch("/api/admin/chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: userMessage.content,
					conversationHistory: messages,
					provider: "gemini",
					model,
					category: selectedCategory || undefined,
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
							} else if (data.type === "done") {
								// Update token count
								assistantTokenCount = data.tokenCount;
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMessageId
											? { ...msg, tokenCount: assistantTokenCount }
											: msg
									)
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

			// If no content was received, show error
			if (!accumulatedContent) {
				throw new Error("No response received from server");
			}

			// === AUTO-SAVE: Save assistant message ===
			if (conversationId) {
				// Always include filters (show "All Districts" / "All Categories" if not selected)
				const saveFilters: { category: string } = {
					category: selectedCategory || "All Categories",
				};

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

	// Types for formatted content

	// Helper function to wrap bullet segments together

	// Export content as PDF with markdown support
	const handleExportText = async (text: string) => {
		if (!text) return;

		try {
			// Dynamic imports to avoid SSR issues
			const jsPDF = (await import("jspdf")).default;

			const doc = new jsPDF();
			const pageWidth = doc.internal.pageSize.getWidth();
			const pageHeight = doc.internal.pageSize.getHeight();
			const margin = 20;
			const maxWidth = pageWidth - 2 * margin;
			let currentY = margin;

			// Helper function to check if we need a new page
			const checkNewPage = (requiredHeight: number = 10) => {
				if (currentY + requiredHeight > pageHeight - margin) {
					doc.addPage();
					currentY = margin;
				}
			};

			// Helper function to render text with formatting
			const renderFormattedText = (
				content: string,
				fontSize: number = 12,
				isBold: boolean = false,
				isItalic: boolean = false
			) => {
				doc.setFontSize(fontSize);

				// Set font style
				if (isBold && isItalic) {
					doc.setFont("helvetica", "bolditalic");
				} else if (isBold) {
					doc.setFont("helvetica", "bold");
				} else if (isItalic) {
					doc.setFont("helvetica", "italic");
				} else {
					doc.setFont("helvetica", "normal");
				}

				const lines = doc.splitTextToSize(content, maxWidth);
				for (const line of lines) {
					checkNewPage();
					doc.text(line, margin, currentY);
					currentY += fontSize * 0.6; // Line height based on font size
				}
			};

			// Helper function to render markdown tables
			const renderMarkdownTable = (tableLines: string[]) => {
				if (tableLines.length < 2) return;

				// Parse table rows
				const rows: string[][] = [];
				for (const line of tableLines) {
					if (line.includes("|")) {
						const cells = line
							.split("|")
							.map((cell) => cell.trim())
							.filter((cell) => cell.length > 0);

						// Skip separator row (| :--- | :--- |)
						if (cells.every((cell) => /^:?-+:?$/.test(cell))) {
							continue;
						}

						rows.push(cells);
					}
				}

				if (rows.length === 0) return;

				// Calculate column widths
				const numCols = Math.max(...rows.map((r) => r.length));
				const colWidth = (maxWidth - 10) / numCols;

				// Add some spacing before table
				currentY += 5;
				checkNewPage(rows.length * 8 + 20);

				// Render table header (first row)
				if (rows.length > 0) {
					doc.setFillColor(240, 240, 240);
					doc.rect(margin, currentY - 5, maxWidth, 10, "F");

					doc.setFont("helvetica", "bold");
					doc.setFontSize(10);

					for (let i = 0; i < rows[0].length; i++) {
						const x = margin + i * colWidth + 2;
						doc.text(rows[0][i], x, currentY);
					}
					currentY += 8;
				}

				// Render table rows
				doc.setFont("helvetica", "normal");
				for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
					checkNewPage(10);

					// Alternate row colors
					if (rowIdx % 2 === 0) {
						doc.setFillColor(250, 250, 250);
						doc.rect(margin, currentY - 5, maxWidth, 8, "F");
					}

					const row = rows[rowIdx];
					for (let colIdx = 0; colIdx < row.length; colIdx++) {
						const x = margin + colIdx * colWidth + 2;
						const cellText = row[colIdx];

						// Handle text wrapping in cells
						const wrappedText = doc.splitTextToSize(cellText, colWidth - 4);
						for (let lineIdx = 0; lineIdx < wrappedText.length; lineIdx++) {
							if (lineIdx > 0) {
								currentY += 6;
								checkNewPage(10);
							}
							doc.text(wrappedText[lineIdx], x, currentY);
						}
					}
					currentY += 8;
				}

				// Draw table borders
				const tableHeight = rows.length * 8 + 3;
				doc.setDrawColor(200, 200, 200);
				doc.setLineWidth(0.5);

				// Outer border
				doc.rect(margin, currentY - tableHeight, maxWidth, tableHeight);

				// Vertical lines
				for (let i = 1; i < numCols; i++) {
					const x = margin + i * colWidth;
					doc.line(x, currentY - tableHeight, x, currentY);
				}

				currentY += 5; // Add spacing after table
			};

			// Parse markdown and render content
			const parseAndRenderMarkdown = (markdownText: string) => {
				// Split content by lines to handle different markdown elements
				const lines = markdownText.split("\n");
				let inCodeBlock = false;
				let inTable = false;
				let tableLines: string[] = [];

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];

					// Detect table start/end
					if (line.includes("|") && !inCodeBlock) {
						if (!inTable) {
							inTable = true;
							tableLines = [line];
						} else {
							tableLines.push(line);
						}

						// Check if next line is not a table line
						if (i === lines.length - 1 || !lines[i + 1].includes("|")) {
							renderMarkdownTable(tableLines);
							inTable = false;
							tableLines = [];
						}
						continue;
					}

					// If we were in a table and hit a non-table line, render it
					if (inTable && !line.includes("|")) {
						renderMarkdownTable(tableLines);
						inTable = false;
						tableLines = [];
					}

					// Handle code blocks
					if (line.startsWith("```")) {
						inCodeBlock = !inCodeBlock;
						if (!inCodeBlock) currentY += 5; // Add spacing after code block
						continue;
					}

					if (inCodeBlock) {
						// Render code with monospace-like formatting
						doc.setFont("courier", "normal");
						doc.setFontSize(10);
						checkNewPage();
						doc.text(line, margin + 10, currentY);
						currentY += 12;
						continue;
					}

					// Handle headers
					if (line.startsWith("# ")) {
						currentY += 10;
						renderFormattedText(line.substring(2), 18, true);
						currentY += 5;
						continue;
					}
					if (line.startsWith("## ")) {
						currentY += 8;
						renderFormattedText(line.substring(3), 16, true);
						currentY += 4;
						continue;
					}
					if (line.startsWith("### ")) {
						currentY += 6;
						renderFormattedText(line.substring(4), 14, true);
						currentY += 3;
						continue;
					}

					// Handle bullet points
					if (line.match(/^[\s]*[-*+]\s/)) {
						const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) * 2;
						const content = line.replace(/^[\s]*[-*+]\s/, "");
						checkNewPage();
						doc.setFont("helvetica", "normal");
						doc.setFontSize(12);
						doc.text("•", margin + indent, currentY);

						// Handle inline formatting in bullet points
						renderInlineFormatting(content, margin + indent + 10);
						continue;
					}

					// Handle numbered lists
					if (line.match(/^[\s]*\d+\.\s/)) {
						const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) * 2;
						const match = line.match(/^[\s]*(\d+)\.\s(.*)$/);
						if (match) {
							const number = match[1];
							const content = match[2];
							checkNewPage();
							doc.setFont("helvetica", "normal");
							doc.setFontSize(12);
							doc.text(`${number}.`, margin + indent, currentY);

							renderInlineFormatting(content, margin + indent + 15);
							continue;
						}
					}

					// Handle empty lines
					if (line.trim() === "") {
						currentY += 6;
						continue;
					}

					// Handle regular paragraphs with inline formatting
					renderInlineFormatting(line);
				}
			};

			// Helper function to render text with inline markdown formatting
			const renderInlineFormatting = (
				text: string,
				startX: number = margin
			) => {
				if (!text.trim()) return;

				// Simple regex patterns for inline formatting
				const boldPattern = /\*\*(.*?)\*\*/g;
				let segments: Array<{
					text: string;
					bold: boolean;
					italic: boolean;
					code: boolean;
				}> = [];

				// Parse the text into segments with formatting
				let lastIndex = 0;
				let match;

				// Handle bold text
				while ((match = boldPattern.exec(text)) !== null) {
					if (match.index > lastIndex) {
						segments.push({
							text: text.substring(lastIndex, match.index),
							bold: false,
							italic: false,
							code: false,
						});
					}
					segments.push({
						text: match[1],
						bold: true,
						italic: false,
						code: false,
					});
					lastIndex = match.index + match[0].length;
				}

				if (lastIndex < text.length) {
					segments.push({
						text: text.substring(lastIndex),
						bold: false,
						italic: false,
						code: false,
					});
				}

				// If no bold formatting found, treat as single segment
				if (segments.length === 0) {
					segments = [{ text: text, bold: false, italic: false, code: false }];
				}

				// Render each segment
				let currentX = startX;
				checkNewPage();

				for (const segment of segments) {
					if (!segment.text) continue;

					// Set font based on formatting
					if (segment.bold) {
						doc.setFont("helvetica", "bold");
					} else if (segment.code) {
						doc.setFont("courier", "normal");
					} else {
						doc.setFont("helvetica", "normal");
					}

					doc.setFontSize(12);

					// Handle text wrapping
					const lines = doc.splitTextToSize(
						segment.text,
						maxWidth - (currentX - margin)
					);
					for (let i = 0; i < lines.length; i++) {
						if (i > 0) {
							currentY += 7;
							checkNewPage();
							currentX = margin;
						}
						doc.text(lines[i], currentX, currentY);
						if (i === lines.length - 1) {
							currentX += doc.getTextWidth(lines[i]);
						}
					}
				}
				currentY += 7;
			};

			// Add title
			doc.setFontSize(16);
			doc.setFont("helvetica", "bold");
			doc.text("Smart Docs Response", margin, currentY);
			currentY += 15;

			// Add timestamp
			doc.setFontSize(10);
			doc.setFont("helvetica", "normal");
			doc.text(`Generated: ${new Date().toLocaleString()}`, margin, currentY);
			currentY += 20;

			// Parse and render main content
			parseAndRenderMarkdown(text);

			// Sources are kept in chat display but excluded from PDF export

			// Generate filename and download
			const filename = `cid-ai-response-${new Date()
				.toISOString()
				.slice(0, 19)
				.replace(/:/g, "-")}.pdf`;

			doc.save(filename);
		} catch (err) {
			console.error("Failed to export PDF:", err);
			alert("Failed to export PDF. Please try again.");
		}
	};

	return (
		<div className="flex h-full">
			{/* Conversation Sidebar */}
			<ConversationSidebar
				currentConversationId={currentConversationId}
				onSelectConversation={loadConversation}
				onNewConversation={startNewConversation}
				refreshTrigger={sidebarRefreshTrigger}
			/>

			{/* Main Chat Area */}
			<div className="flex-1 p-2 overflow-hidden">
				{error && (
					<Alert className="mb-4" variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Card className="h-[calc(100vh-24px)] flex flex-col">
					<CardHeader className="pb-4 flex-shrink-0">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div className="flex items-center gap-4">
								<CardTitle className="flex items-center gap-2 whitespace-nowrap">
									<MessageSquare className="h-5 w-5" />
									Chat History
								</CardTitle>

								<div className="flex items-center gap-2">
									<label
										htmlFor="model"
										className="text-sm text-gray-600 whitespace-nowrap"
									>
										AI Model:
									</label>
									<select
										id="model"
										className="h-9 w-48 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										value={model}
										onChange={(e) => setModel(e.target.value)}
									>
										{modelsLoading && <option>Loading models...</option>}
										{!modelsLoading && models.length === 0 && (
											<option>No models configured</option>
										)}
										{!modelsLoading &&
											models.map((m) => (
												<option key={m.name} value={m.name}>
													{m.label || m.name}
												</option>
											))}
									</select>
								</div>

								<div className="flex items-center gap-2">
									<label
										htmlFor="category"
										className="text-sm text-gray-600 whitespace-nowrap"
									>
										Category:
									</label>
									<select
										id="category"
										className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										value={selectedCategory}
										onChange={(e) => setSelectedCategory(e.target.value)}
										disabled={categoriesLoading}
									>
										<option value="">All Categories</option>
										{categoriesLoading && (
											<option>Loading categories...</option>
										)}
										{!categoriesLoading && categories.length === 0 && (
											<option>No categories found</option>
										)}
										{!categoriesLoading &&
											categories.map((category) => (
												<option key={category} value={category}>
													{category}
												</option>
											))}
									</select>
								</div>
							</div>

							{messages.length > 0 && (
								<Button variant="outline" size="sm" onClick={clearChat}>
									Clear Chat
								</Button>
							)}
						</div>
					</CardHeader>

					<CardContent className="flex-1 flex flex-col p-0 min-h-0">
						<div
							className="flex-1 overflow-y-auto p-4 scroll-smooth"
							ref={scrollAreaRef}
							style={{ scrollBehavior: "smooth" }}
						>
							{messages.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
									<Bot className="h-12 w-12" />
									<div className="text-center">
										<p className="text-lg font-medium">
											Welcome to Smart Docs Assistant
										</p>
										<p className="text-sm">
											Ask me anything about the database records
										</p>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									{messages.map((message) => (
										<div
											key={message.id}
											className={`flex gap-3 ${
												message.role === "user"
													? "justify-end"
													: "justify-start"
											}`}
										>
											<div
												className={`flex gap-3 max-w-[90%] ${
													message.role === "user"
														? "flex-row-reverse"
														: "flex-row"
												}`}
											>
												<div
													className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full ${
														message.role === "user"
															? "bg-blue-500 text-white"
															: "bg-gray-200 text-gray-700"
													}`}
												>
													{message.role === "user" ? (
														<User className="h-4 w-4" />
													) : (
														<Bot className="h-4 w-4" />
													)}
												</div>
												<div
													className={`rounded-lg px-4 py-2 break-words ${
														message.role === "user"
															? "bg-blue-500 text-white"
															: "bg-gray-100 text-gray-900"
													}`}
												>
													<div className="text-sm break-words prose prose-sm max-w-none">
														{message.role === "assistant" ? (
															<>
																{/* Show loading indicator for placeholder and progress messages */}
																{message.content.includes(
																	"Analyzing your question"
																) ||
																message.content.includes(
																	"Generating response"
																) ||
																message.content.includes("Processing") ||
																message.content.includes("Synthesizing") ? (
																	<div className="flex items-center gap-2 text-gray-600">
																		<Loader2 className="h-4 w-4 animate-spin" />
																		<span>{message.content}</span>
																	</div>
																) : (
																	<>
																		<ReactMarkdown
																			remarkPlugins={[remarkGfm]}
																			components={{
																				// Custom styling for markdown elements
																				p: ({ children }) => (
																					<p className="mb-2 last:mb-0 break-words leading-relaxed">
																						{children}
																					</p>
																				),
																				ul: ({ children }) => (
																					<ul className="list-disc list-outside ml-4 mb-2 space-y-1">
																						{children}
																					</ul>
																				),
																				ol: ({ children }) => (
																					<ol className="list-decimal list-outside ml-4 mb-2 space-y-1">
																						{children}
																					</ol>
																				),
																				li: ({ children }) => (
																					<li className="leading-relaxed">
																						{children}
																					</li>
																				),
																				strong: ({ children }) => (
																					<strong className="font-bold text-gray-900">
																						{children}
																					</strong>
																				),
																				em: ({ children }) => (
																					<em className="italic">{children}</em>
																				),
																				code: ({ children }) => (
																					<code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
																						{children}
																					</code>
																				),
																				h1: ({ children }) => (
																					<h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-gray-900">
																						{children}
																					</h1>
																				),
																				h2: ({ children }) => (
																					<h2 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900">
																						{children}
																					</h2>
																				),
																				h3: ({ children }) => (
																					<h3 className="text-sm font-bold mb-2 mt-2 first:mt-0 text-gray-900">
																						{children}
																					</h3>
																				),
																				table: ({ children }) => (
																					<div className="overflow-x-auto my-4">
																						<table className="min-w-full border-collapse border border-gray-300 text-sm">
																							{children}
																						</table>
																					</div>
																				),
																				thead: ({ children }) => (
																					<thead className="bg-gray-50">
																						{children}
																					</thead>
																				),
																				tbody: ({ children }) => (
																					<tbody className="bg-white">
																						{children}
																					</tbody>
																				),
																				tr: ({ children }) => (
																					<tr className="border-b border-gray-200">
																						{children}
																					</tr>
																				),
																				th: ({ children }) => (
																					<th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900 bg-gray-50">
																						{children}
																					</th>
																				),
																				td: ({ children }) => (
																					<td className="border border-gray-300 px-4 py-2 text-gray-700">
																						{children}
																					</td>
																				),
																			}}
																		>
																			{message.content}
																		</ReactMarkdown>
																		<div className="flex items-center gap-1 mt-2">
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-7 w-7"
																				onClick={() =>
																					handleCopy(
																						message.content,
																						message.id
																					)
																				}
																				title="Copy to clipboard"
																			>
																				{copiedMessageId === message.id ? (
																					<Check className="h-3.5 w-3.5 text-green-500" />
																				) : (
																					<Copy className="h-3.5 w-3.5" />
																				)}
																			</Button>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="h-7 w-7"
																				onClick={async () =>
																					await handleExportText(
																						message.content
																					)
																				}
																				title="Download as PDF"
																			>
																				<FileDown className="h-3.5 w-3.5" />
																			</Button>
																		</div>
																	</>
																)}
															</>
														) : (
															<div className="whitespace-pre-wrap">
																{message.content}
															</div>
														)}
													</div>
													<div
														className={`text-xs mt-1 flex items-center gap-2 ${
															message.role === "user"
																? "text-blue-100"
																: "text-gray-500"
														}`}
													>
														<span>{formatTimestamp(message.timestamp)}</span>
														{message.role === "assistant" &&
															message.tokenCount && (
																<span className="border-l border-gray-300 dark:border-gray-700 pl-2 flex items-center">
																	<span title="Input tokens">
																		In:{" "}
																		{message.tokenCount.input.toLocaleString()}
																	</span>
																	<span className="mx-1">|</span>
																	<span title="Output tokens">
																		Out:{" "}
																		{message.tokenCount.output.toLocaleString()}
																	</span>
																</span>
															)}
													</div>
													{/* Display active filters */}
													{message.role === "assistant" && message.filters && (
														<div className="mt-2 flex flex-wrap gap-2 text-xs">
															<div className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-300 px-2 py-1 rounded">
																<span className="font-medium">Category:</span>
																<span>
																	{message.filters.category || "All Categories"}
																</span>
															</div>
														</div>
													)}
													{message.sources && message.sources.length > 0 && (
														<div className="mt-2 space-y-1">
															<div className="text-xs font-medium text-gray-600">
																Sources ({message.sources.length}):
															</div>
															<div className="flex flex-wrap gap-1">
																{/* Show initial sources or all if expanded */}
																{(expandedSources[message.id]
																	? message.sources
																	: message.sources.slice(
																			0,
																			INITIAL_SOURCES_SHOWN
																	  )
																).map((source, index) => (
																	<Link
																		key={`${source.id}-${index}`}
																		href={`/admin/files/${source.id}`}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-block"
																		title={source.title}
																	>
																		<Badge
																			variant="secondary"
																			className="text-xs hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer group max-w-xs"
																		>
																			<FileText className="h-3 w-3 mr-1 flex-shrink-0" />
																			<span className="truncate">
																				{truncateTitle(source.title, 35)}
																			</span>
																			<ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
																		</Badge>
																	</Link>
																))}

																{/* Show "Show more/less" button if there are more sources than the initial limit */}
																{message.sources.length >
																	INITIAL_SOURCES_SHOWN && (
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			toggleSourceExpansion(message.id)
																		}
																		className="text-xs text-blue-600 hover:text-blue-800 py-1 h-auto"
																	>
																		{expandedSources[message.id]
																			? `Show less`
																			: `Show ${
																					message.sources.length -
																					INITIAL_SOURCES_SHOWN
																			  } more...`}
																	</Button>
																)}
															</div>
														</div>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="border-t p-4 flex-shrink-0">
							<div className="flex gap-2">
								<Input
									ref={inputRef}
									value={inputMessage}
									onChange={(e) => setInputMessage(e.target.value)}
									onKeyPress={handleKeyPress}
									placeholder="Ask about Smart Docs database records..."
									disabled={isLoading}
									className="flex-1"
									maxLength={1000}
								/>
								<Button
									onClick={handleSendMessage}
									disabled={!inputMessage.trim() || isLoading}
									size="icon"
								>
									{isLoading ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Send className="h-4 w-4" />
									)}
								</Button>
							</div>
							<div className="flex justify-between items-center text-xs text-gray-500 mt-2">
								<span>{inputMessage.length}/1000 characters</span>
								{lastResponseMeta && (
									<div className="flex gap-2">
										<Badge variant="outline" className="text-xs">
											Type: {lastResponseMeta.queryType}
										</Badge>
										{lastResponseMeta.analysisUsed && (
											<Badge variant="outline" className="text-xs bg-green-50">
												AI Analysis ✓
											</Badge>
										)}
									</div>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
