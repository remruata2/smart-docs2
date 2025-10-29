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

interface ChatSource {
  id: number;
  title: string;
}

interface ChatResponse {
  success: boolean;
  message: ChatMessage;
  sources: ChatSource[];
  searchQuery: string;
  queryType?: string;
  analysisUsed?: boolean;
  error?: string;
}

export default function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [districts, setDistricts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState<boolean>(false);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
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
        const list: Array<{ name: string; label: string }> = Array.isArray(data.models)
          ? data.models
          : [];
        // Always have at least fallback models
        const finalModels = list.length > 0 ? list : [
          { name: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
          { name: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
        ];
        setModels(finalModels);
        // If current model not in list, set to first available
        if (finalModels.length > 0 && !finalModels.some((m) => m.name === model)) {
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

  // Load available districts
  useEffect(() => {
    async function loadDistricts() {
      try {
        setDistrictsLoading(true);
        const res = await fetch('/api/admin/districts');
        if (!res.ok) throw new Error('Failed to load districts');
        const data = await res.json();
        setDistricts(data.districts || []);
      } catch (e) {
        console.error('[AdminChat] Failed to fetch districts', e);
        setDistricts([]);
      } finally {
        setDistrictsLoading(false);
      }
    }
    loadDistricts();
  }, []);

  // Load available categories
  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        const url = selectedDistrict
          ? `/api/admin/categories?district=${encodeURIComponent(selectedDistrict)}`
          : '/api/admin/categories';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load categories');
        const data = await res.json();
        setCategories(data.categories || []);
        // Reset selected category if it's not in the new list
        if (selectedCategory && !data.categories?.includes(selectedCategory)) {
          setSelectedCategory("");
        }
      } catch (e) {
        console.error('[AdminChat] Failed to fetch categories', e);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, [selectedDistrict]);

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
          district: selectedDistrict || undefined,
          category: selectedCategory || undefined,
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
            // We return here so we don't also add an error to the chat
            return;
          }
          throw new Error(errorData.error || "An unknown error occurred");
        } else {
          const errorText = await response.text();
          console.error("Received non-JSON error response:", errorText);
          
          // Show toast for non-JSON errors (like 504 Gateway Timeout)
          let errorMessage = "The server returned an unexpected response";
          if (errorText.includes("504 Gateway Time-out")) {
            errorMessage = "Server timeout. Please try again later.";
          } else if (errorText.includes("502 Bad Gateway")) {
            errorMessage = "Server error. Please try again later.";
          } else if (errorText.includes("500 Internal Server Error")) {
            errorMessage = "Internal server error. Please try again later.";
          }
          
          toast.error(errorMessage);
          throw new Error(
            "The server returned an unexpected response. Check the console for details."
          );
        }
      }

      const data: ChatResponse = await response.json();

      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setLastResponseMeta({
          queryType: data.queryType,
          searchQuery: data.searchQuery,
          analysisUsed: data.analysisUsed,
        });
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (error: unknown) {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);

      let displayMessage = `I apologize, but I encountered an error: ${errorMessage}. Please try again.`;

      if (error instanceof Error && error.message.includes("The server returned an unexpected response")) {
        displayMessage = "I apologize, but the server returned an unexpected response. Please try again later.";
      }

      const errorChatMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: displayMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);
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
  const handleExportText = async (text: string, sources?: ChatSource[]) => {
    if (!text) return;

    try {
      // Dynamic imports to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      
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
      const renderFormattedText = (content: string, fontSize: number = 12, isBold: boolean = false, isItalic: boolean = false) => {
        doc.setFontSize(fontSize);
        
        // Set font style
        if (isBold && isItalic) {
          doc.setFont('helvetica', 'bolditalic');
        } else if (isBold) {
          doc.setFont('helvetica', 'bold');
        } else if (isItalic) {
          doc.setFont('helvetica', 'italic');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        const lines = doc.splitTextToSize(content, maxWidth);
        for (const line of lines) {
          checkNewPage();
          doc.text(line, margin, currentY);
          currentY += fontSize * 0.6; // Line height based on font size
        }
      };

      // Parse markdown and render content
      const parseAndRenderMarkdown = (markdownText: string) => {
        // Split content by lines to handle different markdown elements
        const lines = markdownText.split('\n');
        let inCodeBlock = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Handle code blocks
          if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            if (!inCodeBlock) currentY += 5; // Add spacing after code block
            continue;
          }

          if (inCodeBlock) {
            // Render code with monospace-like formatting
            doc.setFont('courier', 'normal');
            doc.setFontSize(10);
            checkNewPage();
            doc.text(line, margin + 10, currentY);
            currentY += 12;
            continue;
          }

          // Handle headers
          if (line.startsWith('# ')) {
            currentY += 10;
            renderFormattedText(line.substring(2), 18, true);
            currentY += 5;
            continue;
          }
          if (line.startsWith('## ')) {
            currentY += 8;
            renderFormattedText(line.substring(3), 16, true);
            currentY += 4;
            continue;
          }
          if (line.startsWith('### ')) {
            currentY += 6;
            renderFormattedText(line.substring(4), 14, true);
            currentY += 3;
            continue;
          }

          // Handle bullet points
          if (line.match(/^[\s]*[-*+]\s/)) {
            const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) * 2;
            const content = line.replace(/^[\s]*[-*+]\s/, '');
            checkNewPage();
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text('•', margin + indent, currentY);
            
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
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(12);
              doc.text(`${number}.`, margin + indent, currentY);
              
              renderInlineFormatting(content, margin + indent + 15);
              continue;
            }
          }

          // Handle empty lines
          if (line.trim() === '') {
            currentY += 6;
            continue;
          }

          // Handle regular paragraphs with inline formatting
          renderInlineFormatting(line);
        }
      };

      // Helper function to render text with inline markdown formatting
      const renderInlineFormatting = (text: string, startX: number = margin) => {
        if (!text.trim()) return;

        // Simple regex patterns for inline formatting
        const boldPattern = /\*\*(.*?)\*\*/g;
        let segments: Array<{text: string, bold: boolean, italic: boolean, code: boolean}> = [];

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
              code: false
            });
          }
          segments.push({
            text: match[1],
            bold: true,
            italic: false,
            code: false
          });
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
          segments.push({
            text: text.substring(lastIndex),
            bold: false,
            italic: false,
            code: false
          });
        }

        // If no bold formatting found, treat as single segment
        if (segments.length === 0) {
          segments = [{text: text, bold: false, italic: false, code: false}];
        }

        // Render each segment
        let currentX = startX;
        checkNewPage();
        
        for (const segment of segments) {
          if (!segment.text) continue;
          
          // Set font based on formatting
          if (segment.bold) {
            doc.setFont('helvetica', 'bold');
          } else if (segment.code) {
            doc.setFont('courier', 'normal');
          } else {
            doc.setFont('helvetica', 'normal');
          }
          
          doc.setFontSize(12);
          
          // Handle text wrapping
          const lines = doc.splitTextToSize(segment.text, maxWidth - (currentX - margin));
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
      doc.setFont('helvetica', 'bold');
      doc.text('ICPS AI Response', margin, currentY);
      currentY += 15;

      // Add timestamp
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, currentY);
      currentY += 20;

      // Parse and render main content
      parseAndRenderMarkdown(text);

      // Add sources if available
      if (sources && sources.length > 0) {
        currentY += 15;
        checkNewPage(30);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Sources:', margin, currentY);
        currentY += 15;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        sources.forEach((source, index) => {
          checkNewPage();
          const sourceText = `${index + 1}. ${source.title}`;
          const sourceLines = doc.splitTextToSize(sourceText, maxWidth);
          
          for (const line of sourceLines) {
            checkNewPage();
            doc.text(line, margin, currentY);
            currentY += 7;
          }
          currentY += 3;
        });
      }

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
    <div className="w-full h-full p-2">

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
                <label htmlFor="model" className="text-sm text-gray-600 whitespace-nowrap">
                  AI Model:
                </label>
                <select
                  id="model"
                  className="h-9 w-48 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {modelsLoading && (
                    <option>Loading models...</option>
                  )}
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
                <label htmlFor="district" className="text-sm text-gray-600 whitespace-nowrap">
                  District:
                </label>
                <select
                  id="district"
                  className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={districtsLoading}
                >
                  <option value="">All Districts</option>
                  {districtsLoading && (
                    <option>Loading districts...</option>
                  )}
                  {!districtsLoading && districts.length === 0 && (
                    <option>No districts found</option>
                  )}
                  {!districtsLoading &&
                    districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="category" className="text-sm text-gray-600 whitespace-nowrap">
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
                    Welcome to ICPS AI Assistant
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
                      message.role === "user" ? "justify-end" : "justify-start"
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
                                    handleCopy(message.content, message.id)
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
                                      message.content,
                                      message.sources
                                    )
                                  }
                                  title="Download as PDF"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gray-200 text-gray-700">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg px-4 py-2 bg-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching database and generating response...
                      </div>
                    </div>
                  </div>
                )}
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
                placeholder="Ask about ICPS database records..."
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
  );
}
