import { prisma } from "@/lib/prisma";
import {
	getGeminiClient,
	recordKeyUsage,
	getActiveModelNames,
	getProviderApiKey,
} from "@/lib/ai-key-store";
import { HybridSearchService } from "./hybrid-search";
import { getSettingInt, getSettingString } from "@/lib/app-settings";
import { processChunkedAnalyticalQuery } from "./chunked-processing";
import { ChartSchema } from "@/lib/chart-schema";
import {
	generateCacheKey,
	getCachedResponse,
	setCachedResponse,
} from "@/lib/response-cache";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { QuestionType } from "@/generated/prisma";

// Developer logging toggle - set to true to see query logs in console
const DEV_LOGGING = true;

// Configuration for relevance extraction
// This feature extracts only relevant information from records to reduce token usage
// while maintaining answer quality. It's particularly useful for large datasets.
const RELEVANCE_EXTRACTION_CONFIG = {
	enabled: false, // Set to false to disable relevance extraction completely
	threshold: 50, // Enable for queries with more than this many records
	debug: true, // Set to true to see detailed extraction logs
};

// AI API timeout configuration (in milliseconds)
const AI_API_TIMEOUT = 90000; // 90 seconds

/**
 * RELEVANCE EXTRACTION FEATURE
 *
 * This feature intelligently extracts only relevant information from database records
 * to reduce token usage while maintaining answer quality. It works by:
 *
 * 1. Analyzing the user's query for keywords
 * 2. Scoring each record's relevance based on query matches
 * 3. For highly relevant records: keeping full content
 * 4. For less relevant records: extracting only key sentences
 *
 * Configuration:
 * - enabled: Set to false to disable completely
 * - threshold: Number of records above which extraction is enabled
 * - debug: Set to true for detailed logging
 *
 * To disable: Set RELEVANCE_EXTRACTION_CONFIG.enabled = false
 * To adjust threshold: Change RELEVANCE_EXTRACTION_CONFIG.threshold
 */

// Performance timing helper function
function timeStart(label: string) {
	const uniqueLabel = `${label}_${Date.now()}_${Math.random()
		.toString(36)
		.substr(2, 9)}`;
	console.time(`[TIMING] ${uniqueLabel}`);
	console.log(`[TIMING-START] ${label}`);
	return { startTime: Date.now(), uniqueLabel };
}

function timeEnd(
	label: string,
	timingData: { startTime: number; uniqueLabel: string }
) {
	const elapsed = Date.now() - timingData.startTime;
	console.timeEnd(`[TIMING] ${timingData.uniqueLabel}`);
	console.log(`[TIMING-END] ${label} took ${elapsed}ms`);
	return elapsed;
}

/**
 * Wrap an AI API call with a timeout to prevent hanging requests
 * @param promise The AI API call promise
 * @param timeoutMs Timeout in milliseconds (default: 60s)
 * @param operation Description of the operation (for error messages)
 * @returns The result of the promise if it completes before timeout
 * @throws Error if the promise times out
 */
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number = AI_API_TIMEOUT,
	operation: string = "AI API call"
): Promise<T> {
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => {
			reject(
				new Error(`${operation} timed out after ${timeoutMs / 1000} seconds`)
			);
		}, timeoutMs);
	});

	return Promise.race([promise, timeoutPromise]);
}

/**
 * Developer logging helper function
 */
function devLog(message: string, data?: any) {
	if (DEV_LOGGING) {
		console.log(`[AI-SERVICE-DEV] ${message}`);
		if (data !== undefined) {
			console.log(data);
		}
		console.log("---");
	}
}

// Gemini client is now constructed per-call via getGeminiClient() to support
// admin-managed key rotation and dynamic provider/model selection.

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	originalContent?: string; // For translation toggle
	timestamp: Date;
	sources?: Array<{
		id: number;
		title: string;
		relevance?: number;
		similarity?: number; // For UI display (converted from RRF score or semantic_similarity)
		citation?: {
			pageNumber: number;
		};
	}>;
	tokenCount?: {
		input: number;
		output: number;
	};
	filters?: {
		boardId?: string;
		subjectId?: number;
		chapterId?: number;
		category?: string;
	};
	chartData?: {
		title: string;
		type: "bar" | "line" | "pie" | "area";
		description: string;
		xAxisKey: string;
		seriesKeys: string[];
		data: Array<Record<string, string | number>>;
	};
	suggestedResponses?: string[];
	// Image generation
	imageUrl?: string;
	imageAlt?: string;
	imageGenerating?: boolean;
	imageLimitReached?: boolean;
}

export interface SearchResult {
	id: string | number;
	subject?: string; // Subject name (mapped from search results)
	title: string;
	note: string | null;
	entry_date_real: Date | null;

	// NEW FIELDS from RRF
	rrf_score?: number; // The main score now (approx 0.00 ~ 0.033)
	semantic_rank?: number; // Where it ranked semantically
	keyword_rank?: number; // Where it ranked by keyword

	// OLD FIELDS (Keep optional for backward compatibility)
	rank?: number;
	ts_rank?: number;
	semantic_similarity?: number;
	combined_score?: number;

	citation?: {
		pageNumber: number;
	};

	// Internal flag
	_processed?: boolean;
}

/**
 * Quick pattern-based query classification (no AI needed for simple queries)
 * Returns null if AI analysis is needed
 */
function quickClassifyQuery(query: string): {
	coreSearchTerms: string;
	semanticConcepts?: string; // Optional for backward compatibility
	instructionalTerms: string;
	queryType:
	| "specific_search"
	| "follow_up"
	| "elaboration"
	| "general"
	| "recent_files"
	| "analytical_query"
	| "list_all"
	| "visualization";
	contextNeeded: boolean;
	inputTokens: number;
	outputTokens: number;
} | null {
	const q = query.toLowerCase().trim();

	// Pattern 1: Simple question words (who, what, where, when, why, how)
	if (/^(who|what|where|when|why|how)\s+/i.test(q)) {
		return {
			coreSearchTerms: query,
			instructionalTerms: "",
			queryType: "specific_search",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 2: List all / Show all queries
	if (/^(show|list|display|get|find|give me)\s+(all|every|the)/i.test(q)) {
		return {
			coreSearchTerms: "",
			instructionalTerms: "list all",
			queryType: "list_all",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 3: Analytical queries (summarize, count, total, average, how many)
	if (
		/^(summarize|count|total|average|how many|tell me about|analyze|sum up)/i.test(
			q
		)
	) {
		return {
			coreSearchTerms: query,
			instructionalTerms: "analyze",
			queryType: "analytical_query",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 3.5: Visualization queries (chart, graph, plot)
	if (
		/^(create|make|show|generate|plot)\s+(a\s+)?(chart|graph|plot|visualization)/i.test(
			q
		) ||
		/\b(bar chart|line chart|pie chart|scatter plot|histogram)\b/i.test(q)
	) {
		return {
			coreSearchTerms: query,
			instructionalTerms: "visualize",
			queryType: "visualization",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 4: Recent/Latest queries
	if (
		/\b(recent|latest|newest|last|most recent)\s+(files?|records?|cases?|entries?)\b/i.test(
			q
		)
	) {
		return {
			coreSearchTerms: query,
			instructionalTerms: "",
			queryType: "recent_files",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 6: Simple search queries (find, search for, look for)
	if (/^(find|search|look for|get me)\s+/i.test(q)) {
		const searchTerms = query.replace(/^(find|search|look for|get me)\s+/i, "");
		return {
			coreSearchTerms: searchTerms,
			instructionalTerms: "",
			queryType: "specific_search",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 7: Follow-up questions (short queries, pronouns)
	if (
		q.length < 20 &&
		(/\b(he|she|they|it|him|her|them|this|that|these|those)\b/i.test(q) ||
			/(more|details?|tell me more|elaborate|explain)/i.test(q))
	) {
		return {
			coreSearchTerms: query,
			instructionalTerms: "",
			queryType: "follow_up",
			contextNeeded: true,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// Pattern 8: Greetings / General queries
	if (
		/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/i.test(
			q
		) ||
		/^(help|what can you do|how does this work)/i.test(q)
	) {
		return {
			coreSearchTerms: "",
			instructionalTerms: "",
			queryType: "general",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}

	// No pattern matched - need AI analysis
	return null;
}

/**
 * Analyze user query and extract search keywords using AI
 */
export async function analyzeQueryForSearch(
	currentQuery: string,
	conversationHistory: ChatMessage[] = [],
	opts: { provider?: "gemini"; model?: string; keyId?: number } = {}
): Promise<{
	coreSearchTerms: string;
	semanticConcepts?: string; // Optional for backward compatibility
	instructionalTerms: string;
	queryType:
	| "specific_search"
	| "follow_up"
	| "elaboration"
	| "general"
	| "recent_files"
	| "analytical_query"
	| "list_all"
	| "visualization";
	contextNeeded: boolean;
	inputTokens: number;
	outputTokens: number;
}> {
	try {
		// Try quick pattern-based classification first (90% of queries)
		const quickResult = quickClassifyQuery(currentQuery);
		if (quickResult) {
			console.log(
				`[QUERY ANALYSIS] Quick pattern match: ${quickResult.queryType} (skipped AI analysis)`
			);
			return quickResult;
		}

		// Pattern matching failed - use AI analysis for complex queries
		console.log("[QUERY ANALYSIS] Using AI analysis for complex query");

		// Get model from app_settings (not priority-based aiModel table)
		const { getChatModels, CHAT_AI_MODELS } = await import("@/lib/chat-models");
		let analyzerModel: string = CHAT_AI_MODELS.QUERY_ANALYZER;
		try {
			const chatModels = await getChatModels();
			analyzerModel = chatModels.QUERY_ANALYZER;
		} catch (e) {
			console.warn("[QUERY ANALYSIS] Failed to get settings, using default");
		}

		const attemptModels = [opts.model || analyzerModel].filter(Boolean);

		// Build conversation context
		const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
		const historyContext =
			recentHistory.length > 0
				? `\nRECENT CONVERSATION:\n${recentHistory
					.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
					.join("\n")}\n`
				: "";

		const prompt = `You are the Query Processor for a high-precision RAG system.
Your goal is to break down the user's request into database search parameters.

CURRENT USER QUERY: "${currentQuery}"
${historyContext}

Analyze the query and output the following JSON object:

{
  "coreSearchTerms": "string",   // KEYWORDS: Strict nouns, IDs, Names, Dates (for exact text match)
  "semanticConcepts": "string",  // CONCEPTS: Descriptive phrasing, intent, or meaning (for vector search)
  "queryType": "string",         // ENUM: specific_search, analytical_query, follow_up, elaboration, general, recent_files, list_all, visualization
  "instructionalTerms": "string", // Verbs/Actions (e.g., "summarize", "list", "compare", "chart")
  "contextNeeded": boolean       // True if the query relies on previous messages
}

GUIDELINES:

1. coreSearchTerms: Extract ONLY exact identifiers.
   - User: "Invoice Q-881 payment status" -> "Invoice Q-881"
   - User: "Project Alpha deliverables" -> "Project Alpha deliverables"

2. semanticConcepts: Extract the *meaning* or *topic*.
   - User: "Invoice Q-881 payment status" -> "payment status pending overdue"
   - User: "Project Alpha deliverables" -> "project completion tasks milestones deliverables"

3. queryType:
   - "analytical_query": If asking for trends, counts, averages, or summaries across multiple files.
   - "specific_search": If looking for a specific fact, file, or person.
   - "follow_up": Questions referring to previous results ("Who caught her?", "What happened next?").
   - "elaboration": Requests for more details ("Elaborate", "Tell me more", "Explain further").
   - "general": General questions or greetings.
   - "recent_files": Queries asking for recent/latest/newest files (handled separately).
   - "recent_files": Queries asking for recent/latest/newest files (handled separately).
   - "list_all": Queries asking to list or show all records/files (e.g., "list all records", "show all documents").
   - "visualization": Requests to create charts, graphs, or plots (e.g., "Plot revenue over time").

4. IMPORTANT:
   - If the query asks for "recent", "latest", "newest", or "most recent" files/records/cases, classify it as "recent_files".
   - If the query asks to "list all", "show all", "find all", or similar requests to display all records, classify it as "list_all".
   - For follow_up and elaboration queries, you MUST extract keywords from the conversation history.

Examples:
- "Documents from 2007?" → {"coreSearchTerms": "documents 2007", "semanticConcepts": "documents records year 2007", "instructionalTerms": "", "queryType": "specific_search", "contextNeeded": false}
- "What happened next?" → {"coreSearchTerms": "next follow up continuation", "semanticConcepts": "sequence progression continuation", "instructionalTerms": "", "queryType": "follow_up", "contextNeeded": true}
- "Summarize the project on Alpha" → {"coreSearchTerms": "Alpha", "semanticConcepts": "project summary overview details", "instructionalTerms": "summarize project", "queryType": "analytical_query", "contextNeeded": false}

Respond ONLY with valid JSON.`;

		let text: string = "";
		let analysisInputTokens = 0;
		let analysisOutputTokens = 0;
		let lastError: any = null;

		// Use retry utility
		const { executeGeminiWithRetry } = await import("@/lib/ai-retry");

		for (const modelName of attemptModels) {
			try {
				const result = await executeGeminiWithRetry(async (model, keyInfo) => {
					console.log(`[AI-ANALYSIS] Using Key: "${keyInfo.keyLabel}" (${keyInfo.keyId})`);
					// Count input tokens
					try {
						const countRes: any = await model.countTokens({
							contents: [{ role: "user", parts: [{ text: prompt }] }],
						});
						analysisInputTokens = (countRes?.totalTokens || 0);
					} catch (e) {
						analysisInputTokens = estimateTokenCount(prompt);
					}

					const genResult = await withTimeout(
						model.generateContent(prompt),
						AI_API_TIMEOUT,
						"Query analysis AI call"
					);
					const response = await genResult.response;
					const t = response.text().trim();

					// Capture tokens
					const usage: any = (response as any)?.usageMetadata;
					analysisOutputTokens = (usage?.candidatesTokenCount || estimateTokenCount(t));

					return t;
				}, {
					modelName: modelName as string,
					logLabel: "QUERY ANALYSIS"
				});

				text = result.result;
				lastError = null;
				break;
			} catch (e: any) {
				lastError = e;
				const errorMsg = e?.message || String(e);
				console.warn(`[AI] model attempt failed: ${modelName}`, e);
				continue;
			}
		}
		if (lastError) throw lastError;

		console.log("[QUERY ANALYSIS] Raw AI response:", text);

		// Extract JSON from response
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			console.error("[QUERY ANALYSIS] No JSON found in response:", text);
			throw new Error("Invalid response format from AI");
		}

		let analysis;
		try {
			analysis = JSON.parse(jsonMatch[0]);
			console.log("[QUERY ANALYSIS] Parsed analysis:", analysis);
		} catch (parseError) {
			console.error("[QUERY ANALYSIS] JSON parse error:", parseError);
			console.error("[QUERY ANALYSIS] JSON string:", jsonMatch[0]);
			throw new Error("Invalid JSON format from AI");
		}

		// Validate response
		// Allow empty coreSearchTerms for specific_search queries with instructional terms (like "all documents")
		// or for list_all or analytical queries
		const hasValidTerms =
			analysis.coreSearchTerms ||
			(analysis.queryType === "specific_search" &&
				analysis.instructionalTerms) ||
			analysis.queryType === "list_all" ||
			analysis.queryType === "analytical_query";

		if (!hasValidTerms || !analysis.queryType) {
			console.error("[QUERY ANALYSIS] Incomplete analysis:", analysis);
			throw new Error("Incomplete analysis from AI");
		}

		return {
			coreSearchTerms: analysis.coreSearchTerms,
			semanticConcepts: analysis.semanticConcepts, // Extract semanticConcepts from JSON
			instructionalTerms: analysis.instructionalTerms || "",
			queryType: analysis.queryType,
			contextNeeded: analysis.contextNeeded || false,
			inputTokens: analysisInputTokens,
			outputTokens: analysisOutputTokens,
		};
	} catch (error) {
		console.error("Query analysis error:", error);

		// Fallback to simple keyword extraction
		const fallbackKeywords = currentQuery
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.split(" ")
			.filter((word) => word.length > 2)
			.join(" ");

		return {
			coreSearchTerms: fallbackKeywords || currentQuery,
			instructionalTerms: "",
			queryType: "specific_search",
			contextNeeded: false,
			inputTokens: 0,
			outputTokens: 0,
		};
	}
}

/**
 * Get recent chapters sorted by date
 * Updated to use chapters table instead of file_list
 */
export async function getRecentFiles(
	limit: number = 10
): Promise<SearchResult[]> {
	try {
		console.log(`[RECENT CHAPTERS] Fetching ${limit} most recent chapters`);

		const chapters = await prisma.chapter.findMany({
			select: {
				id: true,
				title: true,
				created_at: true,
				subject: {
					select: {
						name: true,
					},
				},
			},
			where: {
				is_active: true,
				processing_status: "COMPLETED",
			},
			orderBy: {
				created_at: "desc",
			},
			take: limit,
		});

		console.log(`[RECENT CHAPTERS] Found ${chapters.length} recent chapters`);

		return chapters.map((chapter) => ({
			id: chapter.id.toString(),
			subject: chapter.subject.name,
			title: chapter.title,
			note: "", // Chapters don't have a note field, content is in chunks
			entry_date_real: chapter.created_at,
			rank: 1.0, // All recent chapters have equal relevance
		}));
	} catch (error) {
		console.error("Recent chapters query error:", error);
		throw new Error("Failed to fetch recent chapters");
	}
}

/**
 * Extract only relevant information from records to reduce token usage
 */
export function extractRelevantInformation(
	records: SearchResult[],
	query: string
): SearchResult[] {
	if (!RELEVANCE_EXTRACTION_CONFIG.enabled) {
		return records; // Return original records if feature is disabled
	}

	console.log(
		`[RELEVANCE-EXTRACTION] Extracting relevant information from ${records.length} records`
	);

	// Convert query to lowercase for matching
	const queryLower = query.toLowerCase();
	const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2);

	// Use semantic search scores to determine relevance
	return records.map((record) => {
		const originalNote = record.note || "";

		// Calculate relevance score based on semantic search results
		const relevanceScore = calculateRelevanceScore(record, queryWords, query);

		// Determine relevance level based on score
		const relevanceLevel = determineRelevanceLevel(relevanceScore, record);

		// Apply appropriate extraction based on relevance level
		switch (relevanceLevel) {
			case "high":
				// Keep full content for highly relevant records
				return record;
			case "medium":
				// Extract key information for medium relevance
				const extractedNote = extractKeyInformation(
					originalNote,
					queryWords,
					query
				);
				return {
					...record,
					note: extractedNote,
					_processed: true,
				};
			case "low":
			default:
				// Extract minimal information for low relevance
				const minimalNote = extractMinimalInformation(
					originalNote,
					queryWords,
					query
				);
				return {
					...record,
					note: minimalNote,
					_processed: true,
				};
		}
	});
}

/**
 * UPDATED: Calculate relevance score based on RRF results
 */
function calculateRelevanceScore(
	record: SearchResult,
	queryWords: string[],
	query: string
): number {
	let score = 0;

	// 1. Use RRF Score (Primary Signal)
	// RRF scores are small (0.0 - 0.033), so we multiply by 1000 to make them usable integers
	if (record.rrf_score !== undefined) {
		score += record.rrf_score * 1000;
		// Example: 0.032 * 1000 = 32 points (Very High)
		// Example: 0.009 * 1000 = 9 points (Low)
	}
	// Fallback for legacy results
	else if (record.combined_score !== undefined) {
		score += record.combined_score * 20;
	}

	// 2. Query word matches in title and content (Keep this logic, it's good)
	const titleLower = record.title.toLowerCase();
	const noteLower = (record.note || "").toLowerCase();
	const subjectLower = (record.subject || "").toLowerCase();

	queryWords.forEach((word) => {
		// Title matches get higher weight
		if (titleLower.includes(word)) {
			score += 5;
		}
		// Content matches
		if (noteLower.includes(word)) {
			score += 3;
		}
		// Subject matches
		if (subjectLower.includes(word)) {
			score += 2;
		}
	});

	// 3. Analyze query type and adjust scoring (Keep this, it's good)
	const queryType = analyzeQueryType(query);
	score = adjustScoreForQueryType(score, queryType, record);

	return score;
}

/**
 * Analyze the type of query to determine what information is most relevant
 */
function analyzeQueryType(query: string): string {
	const queryLower = query.toLowerCase();

	// Check for specific query patterns
	if (
		(queryLower.includes("person") ||
			queryLower.includes("people") ||
			queryLower.includes("individual")) &&
		(queryLower.includes("name") ||
			queryLower.includes("who") ||
			queryLower.includes("participant"))
	) {
		// Check if age is also mentioned
		if (
			queryLower.includes("age") ||
			queryLower.includes("old") ||
			queryLower.includes("years")
		) {
			return "person_with_age";
		}
		return "person";
	}
	if (
		queryLower.includes("location") ||
		queryLower.includes("place") ||
		queryLower.includes("where")
	) {
		return "location";
	}
	if (
		queryLower.includes("date") ||
		queryLower.includes("when") ||
		queryLower.includes("time")
	) {
		return "temporal";
	}
	if (queryLower.includes("age") || queryLower.includes("old")) {
		return "demographic";
	}
	if (
		queryLower.includes("list") ||
		queryLower.includes("all") ||
		queryLower.includes("every")
	) {
		return "comprehensive";
	}
	if (
		queryLower.includes("count") ||
		queryLower.includes("number") ||
		queryLower.includes("total")
	) {
		return "statistical";
	}

	return "general";
}

/**
 * Adjust relevance score based on query type
 */
function adjustScoreForQueryType(
	score: number,
	queryType: string,
	record: SearchResult
): number {
	const noteLower = (record.note || "").toLowerCase();

	switch (queryType) {
		case "person":
			// Boost score for records containing person/people information
			if (
				noteLower.includes("person") ||
				noteLower.includes("people") ||
				noteLower.includes("individual") ||
				noteLower.includes("participant") ||
				noteLower.includes("member") ||
				noteLower.includes("name")
			) {
				score += 10;
			}
			break;
		case "person_with_age":
			// Boost score for records containing person information AND age
			if (
				(noteLower.includes("person") ||
					noteLower.includes("people") ||
					noteLower.includes("individual") ||
					noteLower.includes("participant") ||
					noteLower.includes("member") ||
					noteLower.includes("name")) &&
				(noteLower.includes("age") ||
					noteLower.includes("old") ||
					noteLower.includes("years"))
			) {
				score += 10;
			}
			break;
		case "location":
			// Boost score for records containing location information
			if (
				noteLower.includes("location") ||
				noteLower.includes("place") ||
				noteLower.includes("address") ||
				noteLower.includes("where")
			) {
				score += 8;
			}
			break;
		case "temporal":
			// Boost score for records containing date/time information
			if (
				noteLower.includes("date") ||
				noteLower.includes("time") ||
				/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(noteLower)
			) {
				score += 6;
			}
			break;
		case "demographic":
			// Boost score for records containing age information
			if (noteLower.includes("age") || /\d+\s*years?\s*old/.test(noteLower)) {
				score += 7;
			}
			break;
		case "comprehensive":
			// For comprehensive queries, keep more records relevant
			score += 3;
			break;
		case "statistical":
			// For statistical queries, focus on records with numbers
			if (/\d+/.test(noteLower)) {
				score += 4;
			}
			break;
	}

	return score;
}

/**
 * Determine relevance level based on calculated score
 */
/**
 * UPDATED: Determine relevance level based on RRF
 */
function determineRelevanceLevel(
	score: number,
	record: SearchResult
): "high" | "medium" | "low" {
	// 1. Check RRF Score directly if available
	if (record.rrf_score !== undefined) {
		// Rank 1 in at least one list OR Top 10 in both
		if (record.rrf_score > 0.015) return "high";
		// Rank 50 in at least one list (Basic relevance)
		if (record.rrf_score > 0.005) return "medium";
		return "low";
	}

	// 2. Fallback to calculated score (from calculateRelevanceScore above)
	// Since we multiplied RRF by 1000, a "High" score is around 30+
	if (score > 30) return "high";
	if (score > 15) return "medium";
	return "low";
}

/**
 * Get patterns based on query type for more targeted extraction
 */
function getPatternsForQueryType(
	queryType: string
): Array<{ pattern: RegExp; weight: number; label: string }> {
	const basePatterns = [
		// Name patterns (always relevant)
		{ pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)/g, weight: 2, label: "Name" },
		// File number patterns (always relevant)
		{ pattern: /file\s*no[:\s]*([^.!?]+)/gi, weight: 2, label: "File" },
		{
			pattern: /reference\s*no[:\s]*([^.!?]+)/gi,
			weight: 2,
			label: "Reference",
		},
		{ pattern: /id[:\s]*([^.!?]+)/gi, weight: 2, label: "ID" },
	];

	switch (queryType) {
		case "person":
			return [
				...basePatterns,
				{ pattern: /person[:\s]+([^.!?]+)/gi, weight: 5, label: "Person" },
				{
					pattern: /participant[:\s]+([^.!?]+)/gi,
					weight: 5,
					label: "Participant",
				},
				{ pattern: /member[:\s]+([^.!?]+)/gi, weight: 4, label: "Member" },
				{
					pattern: /individual[:\s]+([^.!?]+)/gi,
					weight: 5,
					label: "Individual",
				},
				{ pattern: /contact[:\s]+([^.!?]+)/gi, weight: 4, label: "Contact" },
				{
					pattern: /name[:\s]+([^.!?]+)/gi,
					weight: 5,
					label: "Name",
				},
			];
		case "person_with_age":
			return [
				...basePatterns,
				{ pattern: /person[:\s]+([^.!?]+)/gi, weight: 5, label: "Person" },
				{
					pattern: /participant[:\s]+([^.!?]+)/gi,
					weight: 5,
					label: "Participant",
				},
				{ pattern: /member[:\s]+([^.!?]+)/gi, weight: 4, label: "Member" },
				{
					pattern: /individual[:\s]+([^.!?]+)/gi,
					weight: 5,
					label: "Individual",
				},
				{ pattern: /contact[:\s]+([^.!?]+)/gi, weight: 4, label: "Contact" },
				{
					pattern: /name[:\s]+([^.!?]+)/gi,
					weight: 5,
					label: "Name",
				},
				{ pattern: /age[:\s]+(\d+)/gi, weight: 5, label: "Age" },
				{ pattern: /(\d+)\s*years?\s*old/gi, weight: 5, label: "Age" },
				{ pattern: /(\d+)\s*years?/gi, weight: 3, label: "Age" },
			];
		case "location":
			return [
				...basePatterns,
				{ pattern: /location[:\s]+([^.!?]+)/gi, weight: 5, label: "Location" },
				{ pattern: /place[:\s]+([^.!?]+)/gi, weight: 4, label: "Place" },
				{ pattern: /address[:\s]+([^.!?]+)/gi, weight: 4, label: "Address" },
				{ pattern: /where[:\s]+([^.!?]+)/gi, weight: 4, label: "Location" },
			];
		case "temporal":
			return [
				...basePatterns,
				{ pattern: /date[:\s]+([^.!?]+)/gi, weight: 5, label: "Date" },
				{ pattern: /time[:\s]+([^.!?]+)/gi, weight: 4, label: "Time" },
				{
					pattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
					weight: 4,
					label: "Date",
				},
				{ pattern: /when[:\s]+([^.!?]+)/gi, weight: 4, label: "Time" },
			];
		case "demographic":
			return [
				...basePatterns,
				{ pattern: /age[:\s]+(\d+)/gi, weight: 5, label: "Age" },
				{ pattern: /(\d+)\s*years?\s*old/gi, weight: 5, label: "Age" },
				{ pattern: /(\d+)\s*years?/gi, weight: 3, label: "Age" },
			];
		case "statistical":
			return [
				...basePatterns,
				{ pattern: /(\d+)/g, weight: 3, label: "Number" },
				{ pattern: /count[:\s]+([^.!?]+)/gi, weight: 4, label: "Count" },
				{ pattern: /total[:\s]+([^.!?]+)/gi, weight: 4, label: "Total" },
			];
		default:
			return [
				...basePatterns,
				// General patterns for unknown query types
				{ pattern: /person[:\s]+([^.!?]+)/gi, weight: 4, label: "Person" },
				{ pattern: /name[:\s]+([^.!?]+)/gi, weight: 4, label: "Name" },
				{ pattern: /location[:\s]+([^.!?]+)/gi, weight: 3, label: "Location" },
				{ pattern: /date[:\s]+([^.!?]+)/gi, weight: 3, label: "Date" },
				{ pattern: /age[:\s]+(\d+)/gi, weight: 3, label: "Age" },
			];
	}
}

/**
 * Extract key information from a note based on query relevance
 */
function extractKeyInformation(
	note: string,
	queryWords: string[],
	query: string
): string {
	if (!note) return "";

	// Split note into sentences
	const sentences = note.split(/[.!?]+/).filter((s) => s.trim().length > 0);

	// Define patterns based on query type
	const queryType = analyzeQueryType(query);
	const patterns = getPatternsForQueryType(queryType);

	// Score sentences based on relevance
	const scoredSentences = sentences.map((sentence) => {
		const sentenceLower = sentence.toLowerCase();
		let score = 0;
		const extractedInfo: string[] = [];

		// Score based on query word matches
		queryWords.forEach((word) => {
			if (sentenceLower.includes(word)) {
				score += 3; // Higher weight for query matches
			}
		});

		// Score based on specific patterns
		patterns.forEach(({ pattern, weight, label }) => {
			const matches = sentence.match(pattern);
			if (matches) {
				score += weight;
				matches.forEach((match) => {
					extractedInfo.push(`${label}: ${match.trim()}`);
				});
			}
		});

		// Score based on relevance keywords
		const relevanceKeywords = [
			"person",
			"people",
			"individual",
			"participant",
			"member",
			"location",
			"place",
			"date",
			"time",
			"age",
			"name",
			"address",
			"phone",
			"email",
			"contact",
			"project",
			"document",
			"record",
		];

		relevanceKeywords.forEach((keyword) => {
			if (sentenceLower.includes(keyword)) {
				score += 1;
			}
		});

		return {
			sentence: sentence.trim(),
			score,
			extractedInfo,
			hasRelevantInfo: extractedInfo.length > 0,
		};
	});

	// Filter and sort by score, prioritize sentences with extracted info
	const relevantSentences = scoredSentences
		.filter((item) => item.score > 0 || item.hasRelevantInfo)
		.sort((a, b) => {
			// Prioritize sentences with extracted info
			if (a.hasRelevantInfo && !b.hasRelevantInfo) return -1;
			if (!a.hasRelevantInfo && b.hasRelevantInfo) return 1;
			// Then sort by score
			return b.score - a.score;
		})
		.slice(0, 5); // Keep top 5 most relevant sentences

	// If we have sentences with extracted info, return those
	const sentencesWithExtractedInfo = relevantSentences.filter(
		(item) => item.hasRelevantInfo
	);
	if (sentencesWithExtractedInfo.length > 0) {
		return (
			sentencesWithExtractedInfo.map((item) => item.sentence).join(". ") + "."
		);
	}

	// If no relevant sentences found, return a very short summary
	if (relevantSentences.length === 0) {
		return `[Summary] ${note.substring(0, 100)}${note.length > 100 ? "..." : ""
			}`;
	}

	// Return relevant sentences
	return relevantSentences.map((item) => item.sentence).join(". ") + ".";
}

/**
 * Extract minimal information for low relevance records
 */
function extractMinimalInformation(
	note: string,
	_queryWords: string[],
	_query: string
): string {
	if (!note) return "";

	// Look for specific patterns that are always relevant
	const essentialPatterns = [
		/person[:\s]+([^.!?]+)/gi,
		/name[:\s]+([^.!?]+)/gi,
		/individual[:\s]+([^.!?]+)/gi,
		/participant[:\s]+([^.!?]+)/gi,
		/location[:\s]+([^.!?]+)/gi,
		/place[:\s]+([^.!?]+)/gi,
		/date[:\s]+([^.!?]+)/gi,
		/time[:\s]+([^.!?]+)/gi,
		/age[:\s]+(\d+)/gi,
		/(\d+)\s*years?\s*old/gi,
		/(\d+)\s*years?/gi, // More general age pattern
		/([A-Z][a-z]+\s+[A-Z][a-z]+)/g, // Names
	];

	const extractedInfo: string[] = [];

	essentialPatterns.forEach((pattern) => {
		const matches = note.match(pattern);
		if (matches) {
			matches.forEach((match) => {
				extractedInfo.push(match.trim());
			});
		}
	});

	// If we found essential info, return it
	if (extractedInfo.length > 0) {
		return `[Essential Info] ${extractedInfo.slice(0, 3).join(", ")}.`;
	}

	// Otherwise return a very short summary
	return `[Summary] ${note.substring(0, 50)}${note.length > 50 ? "..." : ""}`;
}

/**
 * Prepare context for AI with optional relevance extraction
 */
export function prepareContextForAI(
	records: SearchResult[],
	query?: string,
	useRelevanceExtraction: boolean = false
): string {
	const recordCount = records.length;
	console.log(
		`[CONTEXT-PREP] Processing ${recordCount} records for context generation`
	);
	if (records.length === 0) {
		return "No relevant records found in the database.";
	}

	// Apply relevance extraction if enabled
	let processedRecords = records;
	if (useRelevanceExtraction && query) {
		processedRecords = extractRelevantInformation(records, query);
		console.log(
			`[CONTEXT-PREP] Applied relevance extraction to reduce token usage`
		);

		// Add debugging for age-related queries
		const queryType = analyzeQueryType(query);
		if (queryType.includes("age") || query.toLowerCase().includes("age")) {
			console.log(`[CONTEXT-PREP] Age-related query detected: "${query}"`);
			console.log(`[CONTEXT-PREP] Query type: ${queryType}`);

			// Count how many records have age information
			const recordsWithAge = processedRecords.filter((record) => {
				const note = record.note || "";
				return (
					/age[:\s]+(\d+)/gi.test(note) ||
					/(\d+)\s*years?\s*old/gi.test(note) ||
					/(\d+)\s*years?/gi.test(note)
				);
			});
			console.log(
				`[CONTEXT-PREP] Records with age information: ${recordsWithAge.length}/${processedRecords.length}`
			);
		}
	}

	// Group records by subject for smarter organization
	const recordsBySubject = processedRecords.reduce((acc, record) => {
		const subject = record.subject || "Uncategorized";
		if (!acc[subject]) acc[subject] = [];
		acc[subject].push(record);
		return acc;
	}, {} as Record<string, SearchResult[]>);

	// Create a structured index of all records for quick reference
	const recordIndex = processedRecords.map((record) => {
		let relevanceDisplay = "Unknown";

		if (record.rrf_score !== undefined) {
			// Convert RRF to a simple "Rank Score" for the AI to understand
			// Just showing the raw number is fine for Gemini 2.0
			relevanceDisplay = `Score ${record.rrf_score.toFixed(4)}`;
		} else if (record.rank !== undefined) {
			relevanceDisplay = (record.rank * 100).toFixed(1) + "%";
		}

		return {
			id: record.id,
			title: record.title,
			subject: record.subject || "Uncategorized",
			date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
			relevance: relevanceDisplay,
		};
	});

	// Build the full record details with optimized content
	const detailedRecords = processedRecords.map((record) => {
		const content = record.note || "No content available";

		// Debug: Log content length for age-related queries
		if (
			query &&
			(query.toLowerCase().includes("age") ||
				query.toLowerCase().includes("victim"))
		) {
			console.log(
				`[CONTEXT-PREP] Record ${record.id} (${record.title}): content length=${content.length
				}, preview=${content.substring(0, 200)}...`
			);
		}

		// Avoid duplicating metadata if it's already in the note
		const subjectPattern = new RegExp(
			`Subject[^\\n]*${escapeRegExp(record.subject || "")}`,
			"i"
		);
		const titlePattern = new RegExp(
			`Title[^\\n]*${escapeRegExp(record.title)}`,
			"i"
		);

		// Determine relevance display
		let relevanceDisplay = "";
		if (record.rrf_score !== undefined) {
			relevanceDisplay = `Score ${record.rrf_score.toFixed(4)}`;
		} else if (record.rank !== undefined) {
			relevanceDisplay = (record.rank * 100).toFixed(1) + "%";
		}

		return {
			id: record.id,
			title: record.title,
			subject: record.subject || "Uncategorized",
			date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
			content: content,
			relevance: relevanceDisplay,
		};
	});

	// Build the optimized context
	return `
DATABASE CONTEXT:

=== OVERVIEW ===
 Found ${processedRecords.length
		} relevant records from the educational content database.
The records span ${Object.keys(recordsBySubject).length} subjects.
Records are listed below ordered by relevance to your query.

  === RECORD INDEX ===
  ${recordIndex
			.map(
				(r, i) =>
					`[${i + 1}] Chapter: ${r.title} | Subject: ${r.subject} | Date: ${r.date
					} | Relevance: ${r.relevance}`
			)
			.join("\n")}

=== FULL RECORD DETAILS ===
${detailedRecords
			.map(
				(record, index) => `
**Chapter: ${record.title}** (Relevance: ${record.relevance})
Subject: ${record.subject}
Date: ${record.date}
Content: ${record.content}
---`
			)
			.join("\n")}

=== SUBJECT SUMMARY ===
${Object.entries(recordsBySubject)
			.map(([subject, records]) => `${subject}: ${records.length} records`)
			.join("\n")}

END OF DATABASE CONTEXT
`;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Simple utility to estimate token count for a text string
 * This is a very rough approximation - tokens are typically 4 characters on average in English
 */
function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}

/**
 * Generate AI response using Gemini with conversation context
 */
export async function generateAIResponse(
	question: string,
	context: string,
	conversationHistory: ChatMessage[] = [],
	queryType: string = "specific_search",
	opts: { provider?: "gemini"; model?: string; keyId?: number } = {}
): Promise<{
	text: string;
	inputTokens: number;
	outputTokens: number;
	chartData?: any;
}> {
	// Ensure queryType is one of the allowed types, default to specific_search
	const allowedQueryTypes = [
		"specific_search",
		"analytical_query",
		"follow_up",
		"elaboration",
		"general",
		"recent_files",
		"visualization",
	];
	if (!allowedQueryTypes.includes(queryType)) {
		queryType = "specific_search";
	}
	const { client, keyId } = await getGeminiClient({
		provider: "gemini",
		keyId: opts.keyId,
	});

	// Get model from app_settings (not priority-based aiModel table)
	const { getChatModels, CHAT_AI_MODELS } = await import("@/lib/chat-models");
	let chatModel: string = CHAT_AI_MODELS.CHAT_PRIMARY;
	let fallbackModel: string = CHAT_AI_MODELS.CHAT_FALLBACK;
	try {
		const chatModels = await getChatModels();
		chatModel = chatModels.CHAT_PRIMARY;
		fallbackModel = chatModels.CHAT_FALLBACK;
	} catch (e) {
		console.warn("[AI-GEN] Failed to get settings, using defaults");
	}

	const attemptModels = [opts.model || chatModel, fallbackModel].filter(Boolean);

	// Build conversation context for follow-up questions
	const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
	const historyContext =
		recentHistory.length > 0
			? `\nCONVERSATION HISTORY:\n${recentHistory
				.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
				.join("\n")}\n`
			: "";

	// Adjust prompt based on query type
	let roleInstructions = "";
	switch (queryType) {
		case "analytical_query":
			roleInstructions = `
- **Goal:** Provide a clear, comprehensive explanation that helps students understand the topic.
- **Structure:**
  1. **Simple Overview:** Start with a 2-3 sentence explanation in plain language that answers the core question.
  2. **Main Concepts:** Break down the topic into key concepts, explaining each one simply with examples.
  3. **Organized Information:** Group related information by themes (e.g., "Key Points", "How It Works", "Examples", "Important Details").
  4. **Visual Aids:** If numbers/dates are involved, create a Markdown table to make comparisons easy to understand.
  5. **Summary:** End with a brief recap that reinforces the main points.
- **Remember:** Use analogies, real-world examples, and step-by-step explanations to make complex topics easy to grasp.
`;
			break;
		case "follow_up":
			roleInstructions = `
- This is a follow-up question referring to previous conversation.
- Use both the conversation history and database records to answer.
- Connect the current question to what was discussed before, building on previous explanations.
- If the student is asking for clarification, provide a simpler explanation or use a different analogy.
`;
			break;
		case "elaboration":
			roleInstructions = `
- The student wants more detailed information or a deeper explanation.
- Provide comprehensive details from the study materials, but keep explanations simple and clear.
- Expand on the information with additional context, examples, and analogies.
- Break down complex details into smaller, understandable pieces.
`;
			break;
		case "recent_files":
			roleInstructions = `
- The student asked for recent/latest chapters or materials.
- Present the information in a clear, organized manner.
- Include chapter titles, subjects, and dates.
- Mention they are sorted by most recent first.
`;
			break;
		default: // specific_search and general
			roleInstructions = `
- Answer the student's specific question using the provided study materials.
- Explain concepts in simple terms with examples and analogies.
- Be factual and cite relevant information by referencing chapter titles.
- Provide clear, organized information that's easy to follow.
- If explaining a concept, start with the basics and build up to more complex ideas.
`;
	}

	const prompt = `You are a friendly and patient AI tutor helping students learn from their educational materials.
Your task is to explain concepts in simple, easy-to-understand terms using *only* the provided Database Context.

=== DATABASE CONTEXT ===
${context}

=== CONVERSATION HISTORY ===
${historyContext}

=== USER QUESTION ===
"${question}"

=== SYSTEM INSTRUCTIONS ===
1. **Multilingual Support (RESPOND IN USER'S LANGUAGE):**
   - Detect the language the student is using (Mizo, Hindi, or English).
   - ALWAYS respond in the SAME language the student used in their question.
   - If the student asks in Mizo, respond entirely in Mizo.
   - If the student asks in Hindi, respond entirely in Hindi.
   - If the student asks in English, respond entirely in English.
   - Technical terms can remain in English but provide translations in parentheses when helpful.

2. **Student-Friendly Explanations (MOST IMPORTANT):**
   - Explain everything in simple, clear language that students can easily understand.
   - Break down complex concepts into smaller, digestible parts.
   - Use everyday analogies and examples to help students relate to the material.
   - Avoid jargon unless necessary, and always explain technical terms when you use them.
   - Use a conversational, encouraging tone - like a helpful teacher explaining to a student.
   - If explaining a process, use step-by-step instructions with clear numbering or bullet points.
   - Relate concepts to real-world examples that students can visualize.

2. **Strict Citations:** You MUST support every factual claim with a reference to the source chapter/title.
   - Format: Use the chapter title/name directly, or (Source: Chapter Title).
   - Example: "According to the chapter on Introduction (Source: Introduction), the concept works like this..."
   - Always use the exact chapter title as shown in the context.

3. **Hybrid Synthesis:** The context contains both "Keyword Matches" (exact words) and "Semantic Matches" (related concepts).
   - If the user asks about a specific topic, synthesize information from multiple relevant pages.
   - Connect related concepts across different parts of the material.
   - Always cite chapters by their title/name.

4. **Formatting:**
   - Use Markdown tables for structured data (comparisons, lists, key points).
   - Use bullet points for lists and step-by-step explanations.
   - **Bold** key terms, important concepts, and definitions.
   - Use numbered lists for processes or sequences.
   - Break up long explanations into short paragraphs for easy reading.

5. **Data Visualization:**
   - You have the capability to generate charts (bar, line, pie, area).
   - If the user asks to "visualize", "chart", "plot", or "graph" data, acknowledge the request.
   - The system will automatically detect this intent and generate the chart for you.
   - You do not need to generate ASCII charts; a real interactive chart will be rendered.

6. **Image Generation (INTELLIGENT - USE WISELY):**
   - You can generate educational diagrams, illustrations, and visualizations to help explain concepts.
   - **When to generate images (use your judgment):**
     * When explaining complex structures (molecules, cells, organs, circuits, etc.)
     * When describing processes with multiple steps (photosynthesis, digestion, water cycle)
     * When spatial relationships are important (geography, anatomy, physics diagrams)
     * When the student explicitly asks for a visual/diagram/picture
     * When a diagram would significantly improve understanding
   - **When NOT to generate images:**
     * For simple text-based explanations that don't need visuals
     * When answering simple factual questions
     * When the concept is already clear from text
   - **Format:** Use this exact syntax when you decide an image would help:
     [GENERATE_IMAGE: detailed description of the educational image]
   - **Description Guidelines:**
     * Be specific and detailed (include labels, colors, key components)
     * Focus on educational clarity
     * Example: [GENERATE_IMAGE: Labeled diagram of plant cell showing cell wall, cell membrane, nucleus, chloroplasts, mitochondria, and vacuole with arrows pointing to each organelle]
   - **Limit:** Students have 10 images/day. Use images meaningfully to maximize learning value.

7. **Honesty:**
   - If the provided records do not contain the answer, state: "I cannot find information about [X] in the current study materials."
   - Do not invent information.
   - If you're not sure, say so and suggest what the student might look for.

${roleInstructions}

Remember: Your goal is to help students understand, not just to provide information. Make learning easy and enjoyable!

Answer:`;

	// Handle visualization queries using structured output
	if (queryType === "visualization") {
		try {
			console.log("[AI-GEN] Generating structured chart configuration...");
			// Use priority: opts.model → admin config → .env → fallback
			const dbModels = await getActiveModelNames("gemini");
			const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";
			const modelName = opts.model || dbModels[0] || fallbackModel;

			let attempts = 0;
			const maxAttempts = 3;
			const usedKeyIds: number[] = [];

			while (true) {
				attempts++;
				const { apiKey, keyId, keyLabel } = await getProviderApiKey({ provider: "gemini", excludeKeyIds: usedKeyIds });
				const currentLabel = keyLabel || (apiKey ? "Unknown DB Key" : "ENV Variable");
				console.log(`[CHART] Using Key: "${currentLabel}" (${keyId})`);
				const keyToUse = apiKey || process.env.GEMINI_API_KEY;

				if (!keyToUse) {
					throw new Error("No Gemini API key configured for chart generation");
				}

				const google = createGoogleGenerativeAI({
					apiKey: keyToUse,
				});

				try {
					// @ts-ignore - Type instantiation is excessively deep
					const { object } = await generateObject({
						model: google(modelName),
						schema: ChartSchema,
						prompt: `
            You are a data visualization expert.
            Context:
            ${context}
            
            Conversation History:
            ${historyContext}
            
            User Query: ${question}
            
            Generate a chart configuration based on the user's query and the provided context.
            If the data is not sufficient to create a chart, create a chart with empty data and a title indicating "Insufficient Data".
            Ensure the data is cleaned (remove currency symbols, handle missing values).
            `,
					});

					let parsedData: any = object.data;
					if (typeof object.data === "string") {
						try {
							parsedData = JSON.parse(object.data);
						} catch (e) {
							console.error("Failed to parse chart data string:", e);
							parsedData = [];
						}
					}

					if (keyId) await recordKeyUsage(keyId, true);

					const chartConfig = { ...object, data: parsedData };
					console.log(
						"[CHART] Generated chart config:",
						JSON.stringify(chartConfig, null, 2)
					);
					return {
						text: `Here is the ${object.type} chart you requested based on the data.`,
						inputTokens: 0, // Estimate or track if possible
						outputTokens: 0,
						chartData: chartConfig,
					};
				} catch (error: any) {
					if (keyId) await recordKeyUsage(keyId, false);

					const errorMsg = error.message || String(error);
					const isRateLimit = errorMsg.includes('429') || error.status === 429;

					if (isRateLimit && attempts < maxAttempts) {
						console.warn(`[CHART] Key ${keyId} rate limited. Rotating...`);
						if (keyId) usedKeyIds.push(keyId);
						continue;
					}
					throw error;
				}
			}
		} catch (error) {
			console.error("[CHART] Failed to generate chart:", error);
			console.error(
				"[CHART] Error details:",
				error instanceof Error ? error.message : String(error)
			);
			// Fallback to normal generation if chart generation fails
			console.log("[CHART] Falling back to text generation...");
			// Don't return here - let it fall through to normal generation
		}
	}

	let lastError: any = null;
	for (const modelName of attemptModels) {
		try {
			// Ensure retry utility is available
			const { executeGeminiWithRetry } = await import("@/lib/ai-retry");

			const result = await executeGeminiWithRetry(async (model, keyInfo) => {
				console.log(
					`[AI-GEN] Sending request to Gemini API, model=${modelName}, prompt size: ${prompt.length} characters`
				);
				console.log(`[AI-GEN] Using Key: "${keyInfo.keyLabel}" (${keyInfo.keyId})`);
				const apiCallTiming = timeStart("Gemini API Call");

				// Use Gemini native token counter for input tokens
				let inputTokens = 0;
				try {
					const countRes: any = await model.countTokens({
						contents: [{ role: "user", parts: [{ text: prompt }] }],
					});
					inputTokens = (countRes?.totalTokens || 0);
				} catch (e) {
					// Fallback to heuristic only if countTokens fails
					console.warn("[AI-GEN] Input token counting failed, using heuristic:", e);
					inputTokens = estimateTokenCount(prompt);
				}

				const genResult = await withTimeout(
					model.generateContent(prompt),
					AI_API_TIMEOUT,
					`AI response generation (${modelName})`
				);

				const response = await genResult.response;
				const text = response.text();

				// Capture output tokens
				const usage: any = (response as any)?.usageMetadata;
				const outputTokens = (usage?.candidatesTokenCount || estimateTokenCount(text));

				timeEnd("Gemini API Call", apiCallTiming);

				return { text, inputTokens, outputTokens };
			}, {
				modelName: modelName as string,
				logLabel: "AI-GEN"
			});

			const { text, inputTokens, outputTokens } = result.result;
			// Key usage recorded by utility

			return {
				text: text,
				inputTokens,
				outputTokens,
			};
		} catch (error: any) {
			lastError = error;
			// Key usage already recorded by executeGeminiWithRetry
			const errorMsg = error?.message || String(error);
			if (errorMsg.includes("timed out")) {
				console.warn(
					`[AI-GEN] Response generation timeout after ${AI_API_TIMEOUT / 1000
					}s with model: ${modelName}`
				);
			} else {
				console.warn(`[AI-GEN] model attempt failed: ${modelName}`, error);
			}
			continue;
		}
	}
	console.error("AI response generation error (all models failed):", lastError);
	if (lastError?.message && lastError.message.includes("429")) {
		throw new Error("RATE_LIMIT_EXCEEDED");
	}
	// Provide more context in error message
	const errorDetails = lastError
		? `: ${lastError.message || String(lastError)}`
		: " (no models available or configured)";
	throw new Error(`Failed to generate AI response${errorDetails}`);
}

/**
 * Generate AI response using Gemini with streaming support
 * Returns an async generator that yields text chunks as they arrive
 */
export async function* generateAIResponseStream(
	question: string,
	context: string,
	conversationHistory: ChatMessage[] = [],
	queryType: string = "specific_search",
	opts: { provider?: "gemini"; model?: string; keyId?: number } = {}
): AsyncGenerator<
	{
		type: "token" | "done";
		text?: string;
		inputTokens?: number;
		outputTokens?: number;
	},
	void,
	unknown
> {
	// Ensure queryType is one of the allowed types, default to specific_search
	const allowedQueryTypes = [
		"specific_search",
		"analytical_query",
		"follow_up",
		"elaboration",
		"general",
		"recent_files",
	];
	if (!allowedQueryTypes.includes(queryType)) {
		queryType = "specific_search";
	}

	const { client, keyId } = await getGeminiClient({
		provider: "gemini",
		keyId: opts.keyId,
	});
	// Get model from app_settings (not priority-based aiModel table)
	const { getChatModels, CHAT_AI_MODELS } = await import("@/lib/chat-models");
	let chatModel: string = CHAT_AI_MODELS.CHAT_PRIMARY;
	let fallbackModel: string = CHAT_AI_MODELS.CHAT_FALLBACK;
	try {
		const chatModels = await getChatModels();
		chatModel = chatModels.CHAT_PRIMARY;
		fallbackModel = chatModels.CHAT_FALLBACK;
	} catch (e) {
		console.warn("[AI-GEN-STREAM] Failed to get settings, using defaults");
	}

	const attemptModels = [opts.model || chatModel, fallbackModel].filter(Boolean);

	// Build conversation context for follow-up questions
	const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
	const historyContext =
		recentHistory.length > 0
			? `\nCONVERSATION HISTORY:\n${recentHistory
				.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
				.join("\n")}\n`
			: "";

	// Adjust prompt based on query type
	let roleInstructions = "";
	switch (queryType) {
		case "analytical_query":
			roleInstructions = `
- **Goal:** Teach the student about this topic step-by-step, ensuring they understand the "why" and "how".
- **Teaching Style:**
  1. **Hook:** Start with a relatable analogy or simple definition to grab interest.
  2. **Step-by-Step Breakdown:** Explain the concept in logical steps. Don't dump information; guide them through it.
  3. **Check for Understanding:** After a major point, ask a rhetorical checking question (e.g., "See how that connects?").
  4. **Visuals:** Use tables for comparisons.
  5. **Recap:** Summarize the key takeaway.
- **Formatting:** Use Markdown headers (###) and double newlines.
`;
			break;
		case "follow_up":
			roleInstructions = `
- This is a follow-up question. Continue the "lesson" naturally.
- Connect the new question to what we just discussed: "That's a great follow-up! It connects back to..."
- If they are confused, try a different angle or analogy.
- Keep the encouraging teacher tone.
`;
			break;
		case "elaboration":
			roleInstructions = `
- The student wants to go deeper. This is a "teachable moment".
- Provide comprehensive details but keep it structured.
- Use "Let's zoom in on this part..." or "Here's the interesting detail..."
- Ensure they don't get lost in the details by constantly relating back to the main concept.
`;
			break;
		case "recent_files":
			roleInstructions = `
- The student asked for recent/latest chapters or materials.
- Present the information in a clear, organized manner.
- Include chapter titles, subjects, and dates.
- Mention they are sorted by most recent first.
`;
			break;
		default: // specific_search and general
			roleInstructions = `
- Answer the student's specific question directly but gently.
- Start with the direct answer, then explain *why* it is the answer.
- Use examples from the text to illustrate.
- End with an encouraging check-in: "Does that help clarify [Topic]?"
`;
	}

	const prompt = `You are a friendly, patient, and wise AI teacher. Your goal is not just to answer questions, but to *guide* the student to understanding.
Your task is to explain concepts in simple, easy-to-understand terms using *only* the provided Database Context.

=== DATABASE CONTEXT ===
${context}

=== CONVERSATION HISTORY ===
${historyContext}

=== USER QUESTION ===
"${question}"

=== SYSTEM INSTRUCTIONS ===
1. **Multilingual Support (RESPOND IN USER'S LANGUAGE):**
   - Detect the language the student is using (Mizo, Hindi, or English).
   - ALWAYS respond in the SAME language the student used in their question.
   - If the student asks in Mizo, respond entirely in Mizo.
   - If the student asks in Hindi, respond entirely in Hindi.
   - If the student asks in English, respond entirely in English.
   - Technical terms can remain in English but provide translations in parentheses when helpful.

2. **Persona: The Friendly Teacher:**
   - You are not just an AI; you are a patient, encouraging, and wise teacher.
   - Your goal is to *guide* the student to understanding, not just give answers.
   - Use phrases like "Great question!", "Let's break this down," or "Think of it this way..."
   - Be supportive. If a topic is hard, acknowledge it: "This can be tricky, but we'll get it together."

2. **Interactive Teaching Strategy:**
   - **Step-by-Step:** Never overwhelm the student. Break complex answers into numbered steps.
   - **Check-ins:** Occasionally ask if they are following along or want to dive deeper into a specific part.
   - **Analogies:** Always use real-world analogies to explain abstract concepts.

3. **Suggested Questions (OPTIONAL - for exploration):**
   - If appropriate, you may provide 3 related follow-up questions in a JSON block to help students explore further.
   - Format:
   \`\`\`json
   {
     "related_questions": [
       "Question 1?",
       "Question 2?",
       "Question 3?"
     ]
   }
   \`\`\`
   - Do not add any text after this JSON block.

4. **Interactive Response Buttons (REQUIRED):**
   - At the end of EVERY response, you MUST provide 2-3 short, clickable options for the student to reply with.
   - These help guide the conversation and make learning interactive.
   - Format:
   \`\`\`json
   {
     "suggested_responses": [
       "Tell me more",
       "Give an example",
       "What about...?"
     ]
   }
   \`\`\`
   - Keep them short (max 4-5 words).
   - Make them natural responses that fit the context of your answer.
   - Do not add any text after this JSON block.

5. **Formatting Rules:**
   - **NO TABLES:** Do not use Markdown tables. They do not render well on mobile devices. Use bulleted lists or clear text structures instead.
   - Use **bold** for key terms.
   - Use double newlines between paragraphs for better readability.

=== TUTOR MODE INSTRUCTIONS (ACTIVE) ===
You are currently conducting an interactive lesson.
Current Status: The student has started a formal learning session.
Your Goal: Guide the student step-by-step through the chapter.

**CRITICAL: RESPONSE LENGTH & PACING**
1. **KEEP IT SHORT:** Your responses must be bite-sized (max 150 words).
2. **ONE CONCEPT ONLY:** Explain *only* one small concept at a time.
3. **NO DUMPING:** Do NOT summarize the whole chapter. Do NOT list every detail.
4. **WAIT FOR STUDENT:** After explaining one concept and asking a question, STOP. Wait for the answer.

**Tutor Loop Strategy:**
1. **TEACH**: Explain *one* concept at a time clearly and simply. Use analogies.
2. **CHECK**: Immediately after explaining, ask a specific question to verify understanding.
   - Do NOT ask "Do you understand?".
   - Ask a conceptual question like "So, if X happens, what would happen to Y?" or a simple problem to solve.
3. **EVALUATE**:
   - If the student answers correctly: Praise them briefly, then move to the next concept.
   - If incorrect: Explain *why* it was wrong, simplify the concept, and ask a *new* question to check again.
   - Do NOT move on until the student demonstrates mastery.

**INTERACTIVE BUTTONS (REQUIRED):**
At the end of your response, you MUST provide 2-3 short, clickable options for the student to reply with.
Format:
\`\`\`json
{
  "suggested_responses": [
    "Yes, dive deeper",
    "No, explain more",
    "Give me an example"
  ]
}
\`\`\`
- These should be natural responses to your question.
- Keep them short (max 4-5 words).

**Tone:** Encouraging, patient, and structured. You are a personal tutor, not just a search engine.

2. **Strict Citations:** You MUST support every factual claim with a reference to the source chapter/title.
   - Format: Use the chapter title/name directly, or (Source: Chapter Title).
   - Example: "According to the chapter on Introduction (Source: Introduction), the concept works like this..."
   - Always use the exact chapter title as shown in the context.
   - **NEVER mention "Activity X.Y", "Figure X.Y","Exercise X.Y" or similar from the textbook.** Explain concepts directly without referencing textbook exercises.

3. **Hybrid Synthesis:** The context contains both "Keyword Matches" (exact words) and "Semantic Matches" (related concepts).
   - If the user asks about a specific topic, synthesize information from multiple relevant pages.
   - Connect related concepts across different parts of the material.
   - Always cite chapters by their title/name.

4. **Formatting & Structure (CRITICAL):**
   - **Use Double Newlines:** You MUST use double newlines (two blank lines) between paragraphs to ensure they render correctly.
   - **Use Headers:** Use Markdown headers (###) to separate different sections of your answer.
   - **Lists:** Use bullet points or numbered lists for steps, features, or key points.
   - **Bold:** Use **bold** for key terms and important concepts.
   - **Tables:** Use Markdown tables for comparisons or structured data.
   - **Short Paragraphs:** Keep paragraphs short (2-3 sentences) for better readability.

5. **Data Visualization:**
   - You have the capability to generate charts (bar, line, pie, area).
   - If the user asks to "visualize", "chart", "plot", or "graph" data, acknowledge the request.
   - The system will automatically detect this intent and generate the chart for you.
   - You do not need to generate ASCII charts; a real interactive chart will be rendered.

6. **Image Generation (INTELLIGENT - USE WISELY):**
   - You can generate educational diagrams, illustrations, and visualizations to help explain concepts.
   - **When to generate images (use your judgment):**
     * When explaining complex structures (molecules, cells, organs, circuits, etc.)
     * When describing processes with multiple steps (photosynthesis, digestion, water cycle)
     * When spatial relationships are important (geography, anatomy, physics diagrams)
     * When the student explicitly asks for a visual/diagram/picture
     * When a diagram would significantly improve understanding
   - **When NOT to generate images:**
     * For simple text-based explanations that don't need visuals
     * When answering simple factual questions
     * When the concept is already clear from text
   - **Format:** Use this exact syntax when you decide an image would help:
     [GENERATE_IMAGE: detailed description of the educational image]
   - **Description Guidelines:**
     * Be specific and detailed (include labels, colors, key components)
     * Focus on educational clarity
     * Example: [GENERATE_IMAGE: Labeled diagram of plant cell showing cell wall, cell membrane, nucleus, chloroplasts, mitochondria, and vacuole with arrows pointing to each organelle]
   - **Limit:** Students have 10 images/day. Use images meaningfully to maximize learning value.

7. **Knowledge Guidelines:**
   - **Primary Source:** Base your answers on the provided chapter content.
   - **Supplementary Knowledge Allowed:** You may use your general knowledge when:
     * It helps explain or clarify concepts from the chapter
     * The question is related to chapter topics and enhances understanding
     * Providing examples or analogies that complement the chapter material
   - **Strict Boundaries:** Do NOT answer if:
     * The question is completely off-topic or unrelated to the chapter
     * It's about a different subject matter not covered in this chapter
   - **Be Transparent:** If you're adding information beyond the chapter, briefly acknowledge it: "The chapter covers [X], and to help understand this better..."
   - **When Uncertain:** If the chapter doesn't cover something, say: "I cannot find information about [X] in this chapter."

${roleInstructions}

Remember: Your goal is to help students understand, not just to provide information. Make learning easy and enjoyable!

Answer:`;

	let lastError: any = null;
	for (const modelName of attemptModels) {
		try {
			console.log(
				`[AI-GEN-STREAM] Sending streaming request to Gemini API, model=${modelName}`
			);
			const model = client.getGenerativeModel({ model: modelName as string });

			// Count input tokens
			let inputTokens = 0;
			try {
				const countRes: any = await model.countTokens({
					contents: [
						{
							role: "user",
							parts: [{ text: prompt }],
						},
					],
				});
				inputTokens = (countRes?.totalTokens ??
					countRes?.totalTokenCount ??
					0) as number;
			} catch (e) {
				inputTokens = estimateTokenCount(prompt);
				console.warn("[AI-GEN-STREAM] countTokens failed; using heuristic", e);
			}

			// Use priority: opts.model → admin config → .env → fallback
			const dbModels = await getActiveModelNames("gemini");
			const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";
			const streamingModelName = opts.model || dbModels[0] || fallbackModel;
			const streamingModel = client.getGenerativeModel({
				model: streamingModelName as string,
			});

			// Generate streaming response
			const result = await streamingModel.generateContentStream(prompt);
			let fullText = "";

			// Stream tokens as they arrive
			for await (const chunk of result.stream) {
				const chunkText = chunk.text();
				fullText += chunkText;
				yield { type: "token", text: chunkText };
			}

			// Get final response for token counting
			const response = await result.response;
			const usage: any = (response as any)?.usageMetadata;
			const outputTokens = (usage?.candidatesTokenCount ??
				usage?.totalTokenCount ??
				estimateTokenCount(fullText)) as number;

			console.log(
				`[AI-GEN-STREAM] Streaming completed successfully with model: ${modelName}`
			);
			if (keyId) await recordKeyUsage(keyId, true);

			// Yield final metadata
			yield { type: "done", inputTokens, outputTokens };
			return;
		} catch (error: any) {
			lastError = error;
			if (keyId) await recordKeyUsage(keyId, false);
			console.warn(`[AI-GEN-STREAM] model attempt failed: ${modelName}`, error);
			continue;
		}
	}

	console.error("AI response streaming error (all models failed):", lastError);
	throw new Error("Failed to generate AI response stream.");
}

/**
 * Main chat function using enhanced search with conversation context
 */
export async function processChatMessageEnhanced(
	question: string,
	conversationHistory: ChatMessage[] = [],
	searchLimit?: number,
	_useEnhancedSearch: boolean = true,
	opts: { provider?: "gemini"; model?: string; keyId?: number } = {},
	filters?: {
		boardId?: string;
		subjectId?: number;
		chapterId?: number;
	}
): Promise<{
	response: string;
	sources: Array<{
		id: number;
		title: string;
		relevance?: number;
		similarity?: number; // For UI display (converted from RRF score or semantic_similarity)
		citation?: {
			pageNumber: number;
		};
	}>;
	searchQuery: string;
	searchMethod:
	| "hybrid"
	| "semantic_fallback"
	| "tsvector_only"
	| "vector_only"
	| "keyword_only"
	| "recent_files"
	| "analytical_fallback";
	queryType: string;
	analysisUsed: boolean;
	tokenCount?: {
		input: number;
		output: number;
	};
	stats?: {
		tsvectorResults: number;
		semanticResults: number;
		finalResults: number;
	};
	chartData?: any;
}> {
	console.log(`[ADMIN CHAT] User admin asked: "${question}"`);

	let analysisUsed = false;
	let queryForSearch = question;
	let queryType = "specific_search"; // Default
	let searchLimitForRecent = 10; // Default for recent files

	let analysisInputTokens = 0;
	let analysisOutputTokens = 0;
	let analysis: any = null;
	try {
		analysis = await analyzeQueryForSearch(question, conversationHistory, opts);
		console.log("[CHAT ANALYSIS] Processing query:", `"${question}"`);
		console.log(
			"[CHAT ANALYSIS] Conversation history length:",
			conversationHistory.length
		);
		console.log("[CHAT ANALYSIS] Query type:", analysis.queryType);
		console.log(
			"[CHAT ANALYSIS] Core search terms:",
			`"${analysis.coreSearchTerms}"`
		);
		if (analysis.semanticConcepts) {
			console.log(
				"[CHAT ANALYSIS] Semantic concepts:",
				`"${analysis.semanticConcepts}"`
			);
		}
		console.log(
			"[CHAT ANALYSIS] Instructional terms:",
			`"${analysis.instructionalTerms}"`
		);
		console.log("[CHAT ANALYSIS] Context needed:", analysis.contextNeeded);

		analysisUsed = true;
		// Use coreSearchTerms if available, otherwise fall back to instructional terms
		queryForSearch =
			analysis.coreSearchTerms || analysis.instructionalTerms || "";
		queryType = analysis.queryType;

		// Special handling for queries that want to show all records
		if (
			!queryForSearch &&
			analysis.instructionalTerms?.toLowerCase().includes("all")
		) {
			// For "show all" type queries, use empty query to match all records
			queryForSearch = ""; // Empty query to match all records
			console.log(
				'[CHAT ANALYSIS] Using empty search term for "show all" query'
			);
		}
		analysisInputTokens = analysis.inputTokens || 0;
		analysisOutputTokens = analysis.outputTokens || 0;
		console.log(
			`[TOKENS] Analysis phase — input: ${analysisInputTokens}, output: ${analysisOutputTokens}`
		);

		// Check for a number in instructional terms for recent files query
		if (analysis.queryType === "recent_files" && analysis.instructionalTerms) {
			const num = parseInt(analysis.instructionalTerms, 10);
			if (!isNaN(num)) {
				searchLimitForRecent = num;
			}
		}

		// Handle list_all queries
		if (analysis.queryType === "list_all") {
			queryForSearch = ""; // Return all records
			console.log(
				'[CHAT ANALYSIS] Query type is "list_all", returning all records'
			);
		}
	} catch (error) {
		console.error("Failed to analyze query with AI, using raw query.", error);
		// Fallback to using the raw question if analysis fails
		queryForSearch = question;
		analysis = { queryType: "specific_search", contextNeeded: false };
	}

	let records: SearchResult[] = [];
	let searchMethod:
		| "hybrid"
		| "semantic_fallback"
		| "tsvector_only"
		| "recent_files"
		| "analytical_fallback" = "hybrid";
	let searchStats;

	if (queryType === "recent_files") {
		records = await getRecentFiles(searchLimitForRecent);
		searchMethod = "recent_files";
		console.log(`[CHAT ANALYSIS] Found ${records.length} recent files.`);
	} else {
		// Use the new Hybrid Search Service
		// Determine effective search limit: prefer explicit argument; otherwise use admin-configured setting
		const configuredLimit = await getSettingInt("ai.search.limit", 30);
		let effectiveSearchLimit =
			Number.isFinite(searchLimit as any) && (searchLimit as number) > 0
				? Math.floor(searchLimit as number)
				: configuredLimit;
		// Clamp to sensible bounds
		if (effectiveSearchLimit < 1) effectiveSearchLimit = 1;
		if (effectiveSearchLimit > 200) effectiveSearchLimit = 200;

		// For analytical queries with filters, get ALL records matching the filters
		// instead of filtering by search terms (analytical queries need complete data)
		// For analytical queries with filters, get ALL records matching the filters
		// instead of filtering by search terms (analytical queries need complete data)
		const hasFilters = filters && (filters.boardId || filters.subjectId);
		if (queryType === "analytical_query" && hasFilters) {
			console.log(
				`[CHAT ANALYSIS] Analytical query with filters - retrieving all records matching filters for complete analysis`
			);
			const hybridSearchResponse = await HybridSearchService.search(
				"",
				effectiveSearchLimit,
				{
					boardId: filters?.boardId || "CBSE",
					subjectId: filters?.subjectId,
					chapterId: filters?.chapterId,
				}
			);
			records = hybridSearchResponse.results.map((r) => ({
				...r,
				subject: r.subject,
				note: r.content,
				entry_date_real: r.created_at,
				citation: r.citation ? { pageNumber: r.citation.pageNumber } : undefined,
			}));
			searchMethod = "analytical_fallback";
			searchStats = hybridSearchResponse.stats;
			console.log(
				`[CHAT ANALYSIS] Retrieved ${records.length} records matching filters for analytical analysis`
			);
		} else {
			const hybridSearchResponse = await HybridSearchService.search(
				queryForSearch,
				effectiveSearchLimit,
				{
					boardId: filters?.boardId || "CBSE",
					subjectId: filters?.subjectId,
					chapterId: filters?.chapterId,
				}
			);
			records = hybridSearchResponse.results.map((r) => ({
				...r,
				subject: r.subject,
				note: r.content,
				entry_date_real: r.created_at,
				citation: r.citation ? { pageNumber: r.citation.pageNumber } : undefined,
			}));
			// Map RRF search methods to expected types
			const methodMap: Record<
				string,
				| "hybrid"
				| "semantic_fallback"
				| "tsvector_only"
				| "recent_files"
				| "analytical_fallback"
			> = {
				hybrid: "hybrid",
				semantic_fallback: "semantic_fallback",
				tsvector_only: "tsvector_only",
				vector_only: "semantic_fallback", // Map vector_only to semantic_fallback
				keyword_only: "tsvector_only", // Map keyword_only to tsvector_only
			};
			searchMethod = methodMap[hybridSearchResponse.searchMethod] || "hybrid";
			searchStats = hybridSearchResponse.stats;

			console.log(
				`[CHAT ANALYSIS] Hybrid search completed. Method: ${searchMethod}, Found: ${records.length} records.`
			);
		}
	}

	// Fallback for analytical queries: if no records found, retrieve all records for analysis
	if (queryType === "analytical_query" && records.length === 0) {
		console.log(
			`[CHAT ANALYSIS] Analytical query returned 0 records, falling back to all records for analysis`
		);
		const configuredLimit = await getSettingInt("ai.search.limit", 30);
		const effectiveLimit = Math.min(configuredLimit, 200); // Cap at 200 for analytical queries

		const allRecordsResponse = await HybridSearchService.search(
			"",
			effectiveLimit,
			{
				boardId: filters?.boardId || "CBSE",
				subjectId: filters?.subjectId,
				chapterId: filters?.chapterId,
			}
		);
		records = allRecordsResponse.results.map((r) => ({
			...r,
			category: r.subject,
			note: r.content,
			entry_date_real: r.created_at,
		}));
		searchMethod = "analytical_fallback";
		searchStats = allRecordsResponse.stats;
		console.log(
			`[CHAT ANALYSIS] Fallback retrieved ${records.length} records for analytical analysis`
		);
	}

	// Normal processing is more efficient for all queries
	let aiResponse;
	let contextTime = 0;
	let aiTime = 0;
	let context = "";

	// Use chunked processing for analytical queries with many records
	if (analysis.queryType === "analytical_query" && records.length > 20) {
		console.log(
			`[CHAT PROCESSING] Using chunked processing for ${records.length} records`
		);
		const chunkedTiming = timeStart("Chunked Processing");
		aiResponse = await processChunkedAnalyticalQuery(
			question,
			records,
			conversationHistory
		);
		contextTime = timeEnd("Chunked Processing", chunkedTiming);
		console.log(
			`[CHAT PROCESSING] Chunked processing completed in ${contextTime}ms`
		);
		aiTime = contextTime; // For chunked, aiTime is included
	} else {
		// Use normal processing for other queries or small record sets
		console.log(
			`[CHAT PROCESSING] Starting context preparation for ${records.length} records`
		);
		const contextTiming = timeStart("Context Preparation");

		// Use normal processing for all queries (relevance extraction disabled)
		context = prepareContextForAI(records, queryForSearch, false);

		contextTime = timeEnd("Context Preparation", contextTiming);
		console.log(`[CHAT PROCESSING] Context size: ${context.length} characters`);

		// Generate AI response
		console.log(`[CHAT PROCESSING] Starting AI response generation`);
		const aiTiming = timeStart("AI Response Generation");
		aiResponse = await generateAIResponse(
			question,
			context,
			conversationHistory,
			analysis.queryType
		);

		aiTime = timeEnd("AI Response Generation", aiTiming);
		console.log(
			`[TOKENS] Response phase — input: ${aiResponse.inputTokens}, output: ${aiResponse.outputTokens}`
		);
	}

	// Extract sources from the context that were used in the AI response
	console.log(`[CHAT PROCESSING] Starting source extraction`);
	const sourceTiming = timeStart("Source Extraction");

	// Common words to exclude from matching (expanded list)
	const commonWords = new Set([
		"this",
		"that",
		"with",
		"from",
		"they",
		"were",
		"been",
		"have",
		"file",
		"record",
		"document",
		"date",
		"time",
		"place",
		"report",
		"against",
		"under",
		"about",
		"information",
		"data",
	]);

	// Normalize function: remove extension, replace underscores/dashes with spaces
	const normalize = (s: string) =>
		s
			.toLowerCase()
			.replace(/\.[^/.]+$/, "") // Remove file extension
			.replace(/[_-]/g, " ") // Replace underscores and dashes with spaces
			.replace(/\s+/g, " ") // Normalize multiple spaces to single space
			.trim();

	/**
	 * Score chunk by query intent - determines how well a chunk answers the question type
	 */
	function scoreChunkByQueryIntent(
		chunkContent: string,
		query: string,
		queryType: string
	): number {
		if (!chunkContent) return 0;

		const contentLower = chunkContent.toLowerCase();
		const queryLower = query.toLowerCase();

		// Extract question words
		const questionWords = ["who", "what", "when", "where", "why", "how"];
		const questionWord = questionWords.find((w) => queryLower.startsWith(w));

		let intentScore = 0;

		if (questionWord === "who") {
			// Look for names, titles, people identifiers
			const namePatterns =
				/\b(mr|mrs|ms|miss|dr|prof|professor|sir|madam)\s+\w+/gi;
			if (namePatterns.test(contentLower)) intentScore += 5;

			// Look for age indicators (often associated with people)
			if (/\b(age|years?\s*old|aged)\b/i.test(contentLower)) intentScore += 2;

			// Look for person-related keywords
			const personKeywords = [
				"victim",
				"accused",
				"suspect",
				"person",
				"individual",
				"man",
				"woman",
				"child",
				"national",
			];
			personKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		} else if (questionWord === "what") {
			// Look for definitions, descriptions, events
			const definitionPatterns = /\b(is|are|was|were|means?|refers?\s+to)\b/i;
			if (definitionPatterns.test(contentLower)) intentScore += 3;

			// Look for event descriptions
			const eventKeywords = [
				"happened",
				"occurred",
				"incident",
				"event",
				"case",
				"reported",
			];
			eventKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		} else if (questionWord === "when") {
			// Look for dates, time references
			const datePatterns =
				/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/gi;
			if (datePatterns.test(contentLower)) intentScore += 5;

			// Look for time indicators
			const timeKeywords = [
				"at around",
				"at approximately",
				"on",
				"date",
				"time",
				"am",
				"pm",
				"hours?",
			];
			timeKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		} else if (questionWord === "where") {
			// Look for locations, places
			const locationKeywords = [
				"location",
				"place",
				"district",
				"area",
				"region",
				"border",
				"near",
				"at",
				"in",
				"found",
			];
			locationKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});

			// Look for location patterns (capitalized words often indicate places)
			const capitalizedWords = contentLower.match(/\b[A-Z][a-z]+\b/g);
			if (capitalizedWords && capitalizedWords.length > 2) intentScore += 2;
		} else if (questionWord === "why" || questionWord === "how") {
			// Look for explanations, reasons, methods
			const explanationKeywords = [
				"because",
				"due to",
				"reason",
				"caused",
				"result",
				"method",
				"process",
				"by",
			];
			explanationKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		}

		// Boost score if chunk content directly contains query keywords (excluding common words)
		const queryWords = queryLower
			.split(/\s+/)
			.filter((w) => w.length > 3 && !commonWords.has(w));
		const matchingQueryWords = queryWords.filter((word) =>
			contentLower.includes(word)
		);
		if (matchingQueryWords.length > 0) {
			intentScore += matchingQueryWords.length * 0.5;
		}

		return intentScore;
	}

	/**
	 * Calculate combined relevance score for chunk selection during deduplication
	 */
	function calculateChunkRelevance(
		source: any,
		query: string,
		queryType: string
	): number {
		// Get chunk content (stored as note in the record)
		const chunkContent = source.chunkContent || source.note || "";

		// Query intent score (0-10+)
		const intentScore = scoreChunkByQueryIntent(chunkContent, query, queryType);

		// Semantic similarity (0-1, converted to 0-10 scale)
		const semanticScore =
			(source.semanticSimilarity || source.similarity || 0) * 10;

		// RRF score (0-1, converted to 0-5 scale)
		const rrfScore = (source.rrfScore || 0) * 5;

		// Combined score: intent (40%) + semantic (40%) + RRF (20%)
		// This prioritizes chunks that answer the question over chunks with high keyword matches
		const combinedScore =
			intentScore * 0.4 + semanticScore * 0.4 + rrfScore * 0.2;

		return combinedScore;
	}

	const citedSources = records
		.map((record) => {
			const response = aiResponse.text.toLowerCase();
			const title = record.title.toLowerCase();
			const normalizedResponse = normalize(aiResponse.text);
			const normalizedTitle = normalize(record.title);
			let score = 0;

			// Strong signal: Exact title match (primary citation method)
			if (response.includes(title)) {
				score += 10;
			}

			// Strong signal: Normalized title match (handles cleaned up filenames)
			if (normalizedResponse.includes(normalizedTitle)) {
				score += 8; // High score for normalized match
			}

			// Strong signal: Title in citation format (Source: Title)
			if (
				response.includes(`(Source: ${record.title})`) ||
				response.includes(`(source: ${record.title})`)
			) {
				score += 10;
			}

			// Medium signal: Normalized title in citation format
			if (normalizedResponse.includes(`(source: ${normalizedTitle})`)) {
				score += 8;
			}

			// Medium signal: Explicit ID mention (fallback for legacy)
			if (
				response.includes(`id: ${record.id}`) ||
				response.includes(`record ${record.id}`) ||
				response.includes(`[${record.id}]`)
			) {
				score += 5;
			}

			// Medium signal: Most title words present
			const titleWords = title
				.split(/\s+/)
				.filter((word) => word.length > 3 && !commonWords.has(word));
			const titleMatches = titleWords.filter((word) => response.includes(word));
			if (titleMatches.length >= Math.min(titleWords.length * 0.6, 3)) {
				score += 3;
			}

			// Weak signal: Unique keywords from content
			if (record.note) {
				const noteWords = record.note
					.toLowerCase()
					.split(/\s+/)
					.filter(
						(word) =>
							word.length > 5 && // Longer words are more unique
							!commonWords.has(word)
					)
					.slice(0, 15); // Check first 15 words

				const noteMatches = noteWords.filter((word) => response.includes(word));
				// Need at least 3 unique keywords to be confident
				if (noteMatches.length >= 3) {
					score += 2;
				}
			}

			return {
				id: record.id,
				title: record.title,
				relevance: record.rrf_score || record.combined_score || record.rank,
				similarity: record.rrf_score
					? record.rrf_score * 30
					: record.semantic_similarity, // Convert RRF to similarity-like value for UI
				citation: record.citation, // Pass through citation data from hybrid search
				citationScore: score,
				rrfScore: record.rrf_score || 0, // Store RRF score for filtering
				chunkContent: record.note || "", // Store chunk content for query-intent matching
				semanticSimilarity: record.semantic_similarity || 0, // Store semantic similarity
			};
		})
		.filter((source) => {
			// Apply stricter filtering:
			// 1. Minimum citation score (must be explicitly mentioned or strongly matched)
			// 2. Minimum RRF score threshold (filter out weak semantic matches)
			const minCitationScore = 5; // Increased from 3 to 5
			const minRrfScore = 0.01; // Minimum RRF score (approximately top 60 results)

			return (
				source.citationScore >= minCitationScore &&
				source.rrfScore >= minRrfScore
			);
		})
		// Deduplicate by file ID (keep the chunk that best answers the query)
		.reduce((acc: any[], source) => {
			const existing = acc.find((s) => s.id === source.id);
			if (!existing) {
				acc.push(source);
			} else {
				// NEW: Check if chunk content actually appears in AI response
				// This ensures we cite the page that contains the actual answer
				const aiResponseLower = aiResponse.text.toLowerCase();
				const existingContent = (existing.chunkContent || "").toLowerCase();
				const sourceContent = (source.chunkContent || "").toLowerCase();

				// Extract key phrases from AI response (words/phrases that might be quoted)
				const extractKeyPhrases = (text: string): string[] => {
					// Extract quoted text, capitalized phrases, and significant words
					const quoted = text.match(/"([^"]+)"/g) || [];
					const capitalized =
						text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
					// Extract bullet points or list items (often contain specific answers)
					const bulletPoints = text.match(/[•\*\-]\s*([^\n]+)/g) || [];
					// Extract text after colons (often contains specific answers)
					const afterColons = text.match(/:\s*([^\n]+)/g) || [];
					const significantWords = text
						.toLowerCase()
						.split(/\s+/)
						.filter((w) => w.length > 3 && !commonWords.has(w))
						.slice(0, 15);

					return [
						...quoted.map((q) => q.replace(/"/g, "").toLowerCase()),
						...capitalized.map((c) => c.toLowerCase()),
						...bulletPoints.map((b) =>
							b
								.replace(/[•\*\-]\s*/, "")
								.toLowerCase()
								.trim()
						),
						...afterColons.map((a) =>
							a.replace(/:\s*/, "").toLowerCase().trim()
						),
						...significantWords,
					].filter((phrase) => phrase.length > 2); // Filter out very short phrases
				};

				const keyPhrases = extractKeyPhrases(aiResponse.text);

				// Count how many key phrases appear in each chunk
				const existingMatches = keyPhrases.filter((phrase) =>
					existingContent.includes(phrase)
				).length;
				const sourceMatches = keyPhrases.filter((phrase) =>
					sourceContent.includes(phrase)
				).length;

				// Prefer chunk with more matching phrases from AI response
				if (sourceMatches > existingMatches) {
					const index = acc.indexOf(existing);
					acc[index] = source;
				} else if (sourceMatches === existingMatches && sourceMatches > 0) {
					// If same number of matches, use relevance score as tiebreaker
					const existingRelevance = calculateChunkRelevance(
						existing,
						queryForSearch,
						queryType
					);
					const sourceRelevance = calculateChunkRelevance(
						source,
						queryForSearch,
						queryType
					);

					if (sourceRelevance > existingRelevance) {
						const index = acc.indexOf(existing);
						acc[index] = source;
					}
				} else {
					// Fallback to original logic if no content matches
					const existingRelevance = calculateChunkRelevance(
						existing,
						queryForSearch,
						queryType
					);
					const sourceRelevance = calculateChunkRelevance(
						source,
						queryForSearch,
						queryType
					);

					if (sourceRelevance > existingRelevance) {
						const index = acc.indexOf(existing);
						acc[index] = source;
					}
				}
			}
			return acc;
		}, [])
		// Sort by combined score: citation score first, then RRF score
		.sort((a, b) => {
			// Primary sort: citation score (how explicitly mentioned)
			if (b.citationScore !== a.citationScore) {
				return b.citationScore - a.citationScore;
			}
			// Secondary sort: RRF score (relevance to query)
			return b.rrfScore - a.rrfScore;
		})
		// Limit to top 10 most relevant sources
		.slice(0, 10)
		.map(
			({
				citationScore,
				rrfScore,
				chunkContent,
				semanticSimilarity,
				...rest
			}) => rest
		); // Remove internal scores from final output

	console.log(
		`[CITATION-DEBUG] Created ${citedSources.length} sources, sample:`,
		citedSources[0]
	);

	const sourceTime = timeEnd("Source Extraction", sourceTiming);

	console.log(
		`[CHAT ANALYSIS] Generated response with ${citedSources.length} cited sources out of ${records.length} total records used in context.`
	);
	console.log(
		`[ADMIN CHAT] Response generated with ${citedSources.length} sources`
	);

	// Log overall processing time breakdown
	console.log(`[TIMING-SUMMARY] Post-search processing breakdown:`);
	console.log(`[TIMING-SUMMARY] - Context preparation: ${contextTime}ms`);
	console.log(`[TIMING-SUMMARY] - AI response generation: ${aiTime}ms`);
	console.log(`[TIMING-SUMMARY] - Source extraction: ${sourceTime}ms`);
	console.log(
		`[TIMING-SUMMARY] - Total post-search time: ${contextTime + aiTime + sourceTime
		}ms`
	);

	return {
		response: aiResponse.text,
		sources: citedSources,
		searchQuery: queryForSearch,
		searchMethod,
		queryType,
		analysisUsed,
		tokenCount: {
			input: (analysisInputTokens || 0) + (aiResponse.inputTokens || 0),
			output: (analysisOutputTokens || 0) + (aiResponse.outputTokens || 0),
		},
		stats: searchStats,
		chartData: (aiResponse as any).chartData,
	};
}

/**
 * Streaming version of processChatMessageEnhanced
 * Yields chunks as they arrive from the AI, along with metadata
 */
export async function* processChatMessageEnhancedStream(
	question: string,
	conversationHistory: ChatMessage[] = [],
	searchLimit?: number,
	useEnhancedSearch: boolean = true,
	opts: { provider?: "gemini"; model?: string; keyId?: number } = {},
	filters?: {
		boardId?: string;
		subjectId?: number;
		chapterId?: number;
	}
): AsyncGenerator<
	{
		type: "metadata" | "token" | "sources" | "done" | "progress" | "data";
		text?: string;
		sources?: Array<{
			id: number;
			title: string;
			relevance?: number;
			similarity?: number; // For UI display (converted from RRF score or semantic_similarity)
			citation?: {
				pageNumber: number;
			};
		}>;
		searchQuery?: string;
		searchMethod?: string;
		queryType?: string;
		analysisUsed?: boolean;
		tokenCount?: { input: number; output: number };
		stats?: any;
		progress?: string;
		chartData?: any;
		cacheKey?: string;
	},
	void,
	unknown
> {
	// All the same setup logic as processChatMessageEnhanced
	let queryForSearch = question;
	let queryType = "specific_search";
	let analysisUsed = false;
	let analysisInputTokens = 0;
	let analysisOutputTokens = 0;
	let analysis: any = null;
	let semanticCacheKey: string | undefined;

	try {
		analysis = await analyzeQueryForSearch(question, conversationHistory, opts);
		console.log("[CHAT ANALYSIS] Processing query:", `"${question}"`);
		console.log(
			`[CHAT ANALYSIS] AI Analysis Result:`,
			JSON.stringify(analysis, null, 2)
		);
		analysisInputTokens = analysis.inputTokens || 0;
		analysisOutputTokens = analysis.outputTokens || 0;
		analysisUsed = true;
		queryForSearch =
			analysis.coreSearchTerms || analysis.instructionalTerms || "";
		queryType = analysis.queryType;

		// Special handling for queries that want to show all records
		if (
			!queryForSearch &&
			analysis.instructionalTerms?.toLowerCase().includes("all")
		) {
			queryForSearch = ""; // Empty query to match all records
			console.log(
				'[CHAT ANALYSIS] Using empty search term for "show all" query'
			);
		}

		// Handle list_all queries
		if (analysis.queryType === "list_all") {
			queryForSearch = "";
			console.log(
				'[CHAT ANALYSIS] Query type is "list_all", returning all records'
			);
		}
	} catch (error) {
		console.error("[CHAT ANALYSIS] Query analysis failed:", error);
		queryForSearch = question;
	}

	// 1. CHECK CACHE - Use analysis result for semantic key
	if (analysisUsed) {
		try {
			const cacheKey = generateCacheKey({
				coreSearchTerms: analysis.coreSearchTerms,
				queryType: analysis.queryType,
				chapterId: filters?.chapterId,
				subjectId: filters?.subjectId,
			});
			semanticCacheKey = cacheKey; // Store for later usage (e.g. image caching)

			const cachedResponse = await getCachedResponse(cacheKey);

			if (cachedResponse) {
				console.log("[CHAT CACHE] Using cached response");
				// Yield metadata
				yield {
					type: "metadata",
					analysisUsed: true,
					queryType: analysis.queryType,
					searchQuery: queryForSearch,
				};

				// Yield full text immediately
				yield { type: "token", text: cachedResponse.text };

				// Yield cached images if any
				if (cachedResponse.images && cachedResponse.images.length > 0) {
					const imageMarkdown = cachedResponse.images.map(url => `\n\n![Generated Image](${url})`).join("");
					yield { type: "token", text: imageMarkdown };
				}

				// Yield done with cached tokens
				yield {
					type: "done",
					tokenCount: {
						input: cachedResponse.inputTokens,
						output: cachedResponse.outputTokens,
					},
				};
				return;
			}
		} catch (error) {
			console.error("[CHAT CACHE] Error checking cache:", error);
		}
	}

	// Search for relevant records
	let records: SearchResult[] = [];
	let searchMethod: string = "hybrid";
	let searchStats: any = {};

	const configuredLimit = await getSettingInt("ai.search.limit", 30);
	const effectiveSearchLimit = Math.min(searchLimit || configuredLimit, 200);

	console.log(
		`[CHAT ANALYSIS] Effective search limit: ${effectiveSearchLimit}`
	);

	if (useEnhancedSearch) {
		const hasFilters = filters && (filters.boardId || filters.subjectId);
		if (queryType === "analytical_query" && hasFilters) {
			console.log(
				`[CHAT ANALYSIS] Analytical query with filters - retrieving all records matching filters for complete analysis`
			);
			const hybridSearchResponse = await HybridSearchService.search(
				"",
				effectiveSearchLimit,
				{
					boardId: filters?.boardId || "CBSE",
					subjectId: filters?.subjectId,
					chapterId: filters?.chapterId,
				}
			);
			records = hybridSearchResponse.results.map((r) => ({
				...r,
				subject: r.subject,
				note: r.content,
				entry_date_real: r.created_at,
				citation: r.citation ? { pageNumber: r.citation.pageNumber } : undefined,
			}));
			searchMethod = "analytical_fallback";
			searchStats = hybridSearchResponse.stats;
			console.log(
				`[CHAT ANALYSIS] Retrieved ${records.length} records matching filters for analytical analysis`
			);
		} else {
			const hybridSearchResponse = await HybridSearchService.search(
				queryForSearch,
				effectiveSearchLimit,
				{
					boardId: filters?.boardId || "CBSE",
					subjectId: filters?.subjectId,
					chapterId: filters?.chapterId,
				}
			);
			records = hybridSearchResponse.results.map((r) => ({
				...r,
				subject: r.subject,
				note: r.content,
				entry_date_real: r.created_at,
				citation: r.citation ? { pageNumber: r.citation.pageNumber } : undefined,
			}));
			// Map RRF search methods to expected types
			const methodMap: Record<
				string,
				| "hybrid"
				| "semantic_fallback"
				| "tsvector_only"
				| "recent_files"
				| "analytical_fallback"
			> = {
				hybrid: "hybrid",
				semantic_fallback: "semantic_fallback",
				tsvector_only: "tsvector_only",
				vector_only: "semantic_fallback", // Map vector_only to semantic_fallback
				keyword_only: "tsvector_only", // Map keyword_only to tsvector_only
			};
			searchMethod = methodMap[hybridSearchResponse.searchMethod] || "hybrid";
			searchStats = hybridSearchResponse.stats;

			console.log(
				`[CHAT ANALYSIS] Hybrid search completed. Method: ${searchMethod}, Found: ${records.length} records.`
			);
		}
	}

	// Fallback for analytical queries
	if (queryType === "analytical_query" && records.length === 0) {
		console.log(
			`[CHAT ANALYSIS] Analytical query returned 0 records, falling back to all records for analysis`
		);
		const configuredLimit = await getSettingInt("ai.search.limit", 30);
		const effectiveLimit = Math.min(configuredLimit, 200);

		const allRecordsResponse = await HybridSearchService.search(
			"",
			effectiveLimit,
			{
				boardId: filters?.boardId || "CBSE",
				subjectId: filters?.subjectId,
				chapterId: filters?.chapterId,
			}
		);
		records = allRecordsResponse.results.map((r) => ({
			...r,
			category: r.subject,
			note: r.content,
			entry_date_real: r.created_at,
		}));
		searchMethod = "analytical_fallback";
		searchStats = allRecordsResponse.stats;
		console.log(
			`[CHAT ANALYSIS] Fallback retrieved ${records.length} records for analytical analysis`
		);
	}

	// Yield progress after search completes
	yield {
		type: "progress",
		progress: `Found ${records.length} record${records.length !== 1 ? "s" : ""
			}. Preparing response...`,
	};

	// Yield metadata
	yield {
		type: "metadata",
		searchQuery: queryForSearch,
		searchMethod,
		queryType,
		analysisUsed,
		stats: searchStats,
		cacheKey: semanticCacheKey,
	};

	// Check if we need chunked processing for large analytical queries
	let fullResponseText = "";
	let aiInputTokens = 0;
	let aiOutputTokens = 0;

	if (queryType === "analytical_query" && records.length > 20) {
		// Use chunked processing for large analytical queries
		// This is more efficient than streaming for large datasets
		console.log(
			`[CHAT PROCESSING] Using chunked processing for ${records.length} records (streaming disabled for large analytical queries)`
		);

		try {
			// Calculate chunk count for progress display
			const CHUNK_SIZE = 15;
			const chunkCount = Math.ceil(records.length / CHUNK_SIZE);

			// Yield initial progress
			yield {
				type: "progress",
				progress: `Processing ${records.length} records in ${chunkCount} chunks...`,
			};

			const chunkedResponse = await processChunkedAnalyticalQuery(
				question,
				records,
				conversationHistory
			);

			fullResponseText = chunkedResponse.text;
			aiInputTokens = chunkedResponse.inputTokens || 0;
			aiOutputTokens = chunkedResponse.outputTokens || 0;

			// Yield the complete response as one chunk
			yield { type: "token", text: fullResponseText };

			console.log(
				`[CHAT PROCESSING] Chunked processing completed for ${records.length} records`
			);
		} catch (error) {
			console.error("[CHAT PROCESSING] Chunked processing error:", error);
			throw error;
		}
	} else if (queryType === "visualization") {
		// Handle visualization queries using non-streaming generation to get structured data
		console.log(`[CHAT PROCESSING] Handling visualization query`);

		// Yield progress
		yield {
			type: "progress",
			progress: "Generating chart...",
		};

		let context = "";
		if (records.length > 0) {
			context = prepareContextForAI(records, queryForSearch, false);
		}

		try {
			// Call non-streaming generation to get chart data
			console.log(
				"[CHART STREAM] Calling generateAIResponse for visualization"
			);
			const response = await generateAIResponse(
				question,
				context,
				conversationHistory,
				queryType,
				opts
			);

			console.log(
				"[CHART STREAM] Response received, has chartData:",
				!!response.chartData
			);
			fullResponseText = response.text;
			aiInputTokens = response.inputTokens;
			aiOutputTokens = response.outputTokens;

			// Yield the text response
			yield { type: "token", text: fullResponseText };

			// Yield chart data if available
			if (response.chartData) {
				console.log(
					"[CHART STREAM] Yielding chart data:",
					JSON.stringify(response.chartData, null, 2)
				);
				yield {
					type: "data",
					chartData: response.chartData,
				};
			} else {
				console.log(
					"[CHART STREAM] No chart data in response - chart generation may have failed"
				);
			}

			// Yield done event
			yield {
				type: "done",
				tokenCount: { input: aiInputTokens, output: aiOutputTokens },
			};
		} catch (error) {
			console.error("[CHAT PROCESSING] Visualization error:", error);
			throw error;
		}
	} else {
		// Use normal streaming for small queries or non-analytical queries
		let context = "";
		console.log(
			`[CHAT PROCESSING] Starting context preparation for ${records.length} records`
		);

		// Yield progress for context preparation
		yield {
			type: "progress",
			progress: `Preparing context from ${records.length} record${records.length !== 1 ? "s" : ""
				}...`,
		};

		context = prepareContextForAI(records, queryForSearch, false);
		console.log(`[CHAT PROCESSING] Context size: ${context.length} characters`);

		// Stream AI response
		console.log(`[CHAT PROCESSING] Starting AI response streaming`);

		// Yield progress before AI generation starts
		yield {
			type: "progress",
			progress: "Generating response...",
		};

		try {
			for await (const chunk of generateAIResponseStream(
				question,
				context,
				conversationHistory,
				queryType,
				opts
			)) {
				if (chunk.type === "token") {
					fullResponseText += chunk.text || "";
					yield { type: "token", text: chunk.text };
				} else if (chunk.type === "done") {
					aiInputTokens = chunk.inputTokens || 0;
					aiOutputTokens = chunk.outputTokens || 0;
				}
			}
		} catch (error) {
			console.error("[CHAT PROCESSING] Streaming error:", error);
			throw error;
		}
	}

	// 2. STORE IN CACHE - If analysis was used and we have a response
	if (analysisUsed && fullResponseText && fullResponseText.length > 50) {
		try {
			const cacheKey = generateCacheKey({
				coreSearchTerms: analysis.coreSearchTerms,
				queryType: analysis.queryType,
				chapterId: filters?.chapterId,
				subjectId: filters?.subjectId,
			});

			// Don't await cache storage to avoid blocking the user
			setCachedResponse(cacheKey, {
				queryType: analysis.queryType,
				question: question,
				chapterId: filters?.chapterId,
				subjectId: filters?.subjectId,
				response: {
					text: fullResponseText,
					inputTokens: aiInputTokens,
					outputTokens: aiOutputTokens,
				},
			}).catch((err) =>
				console.error("[CACHE] Background storage failed:", err)
			);
		} catch (error) {
			console.error("[CACHE] Error preparing storage:", error);
		}
	}

	// Extract sources after streaming completes
	console.log(`[CHAT PROCESSING] Starting source extraction`);
	const commonWords = new Set([
		"this",
		"that",
		"with",
		"from",
		"they",
		"were",
		"been",
		"have",
		"file",
		"record",
		"document",
		"report",
		"information",
		"data",
		"about",
		"found",
		"created",
		"updated",
	]);

	// Normalize function: remove extension, replace underscores/dashes with spaces
	const normalize = (s: string) =>
		s
			.toLowerCase()
			.replace(/\.[^/.]+$/, "") // Remove file extension
			.replace(/[_-]/g, " ") // Replace underscores and dashes with spaces
			.replace(/\s+/g, " ") // Normalize multiple spaces to single space
			.trim();

	/**
	 * Score chunk by query intent - determines how well a chunk answers the question type
	 * (Same function as in non-streaming version)
	 */
	function scoreChunkByQueryIntent(
		chunkContent: string,
		query: string,
		queryType: string
	): number {
		if (!chunkContent) return 0;

		const contentLower = chunkContent.toLowerCase();
		const queryLower = query.toLowerCase();

		// Extract question words
		const questionWords = ["who", "what", "when", "where", "why", "how"];
		const questionWord = questionWords.find((w) => queryLower.startsWith(w));

		let intentScore = 0;

		if (questionWord === "who") {
			// Look for names, titles, people identifiers
			const namePatterns =
				/\b(mr|mrs|ms|miss|dr|prof|professor|sir|madam)\s+\w+/gi;
			if (namePatterns.test(contentLower)) intentScore += 5;

			// Look for age indicators (often associated with people)
			if (/\b(age|years?\s*old|aged)\b/i.test(contentLower)) intentScore += 2;

			// Look for person-related keywords
			const personKeywords = [
				"victim",
				"accused",
				"suspect",
				"person",
				"individual",
				"man",
				"woman",
				"child",
				"national",
			];
			personKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		} else if (questionWord === "what") {
			// Look for definitions, descriptions, events
			const definitionPatterns = /\b(is|are|was|were|means?|refers?\s+to)\b/i;
			if (definitionPatterns.test(contentLower)) intentScore += 3;

			// Look for event descriptions
			const eventKeywords = [
				"happened",
				"occurred",
				"incident",
				"event",
				"case",
				"reported",
			];
			eventKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		} else if (questionWord === "when") {
			// Look for dates, time references
			const datePatterns =
				/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/gi;
			if (datePatterns.test(contentLower)) intentScore += 5;

			// Look for time indicators
			const timeKeywords = [
				"at around",
				"at approximately",
				"on",
				"date",
				"time",
				"am",
				"pm",
				"hours?",
			];
			timeKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		} else if (questionWord === "where") {
			// Look for locations, places
			const locationKeywords = [
				"location",
				"place",
				"district",
				"area",
				"region",
				"border",
				"near",
				"at",
				"in",
				"found",
			];
			locationKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});

			// Look for location patterns (capitalized words often indicate places)
			const capitalizedWords = contentLower.match(/\b[A-Z][a-z]+\b/g);
			if (capitalizedWords && capitalizedWords.length > 2) intentScore += 2;
		} else if (questionWord === "why" || questionWord === "how") {
			// Look for explanations, reasons, methods
			const explanationKeywords = [
				"because",
				"due to",
				"reason",
				"caused",
				"result",
				"method",
				"process",
				"by",
			];
			explanationKeywords.forEach((keyword) => {
				if (contentLower.includes(keyword)) intentScore += 1;
			});
		}

		// Boost score if chunk content directly contains query keywords (excluding common words)
		const queryWords = queryLower
			.split(/\s+/)
			.filter((w) => w.length > 3 && !commonWords.has(w));
		const matchingQueryWords = queryWords.filter((word) =>
			contentLower.includes(word)
		);
		if (matchingQueryWords.length > 0) {
			intentScore += matchingQueryWords.length * 0.5;
		}

		return intentScore;
	}

	/**
	 * Calculate combined relevance score for chunk selection during deduplication
	 * (Same function as in non-streaming version)
	 */
	function calculateChunkRelevance(
		source: any,
		query: string,
		queryType: string
	): number {
		// Get chunk content (stored as note in the record)
		const chunkContent = source.chunkContent || source.note || "";

		// Query intent score (0-10+)
		const intentScore = scoreChunkByQueryIntent(chunkContent, query, queryType);

		// Semantic similarity (0-1, converted to 0-10 scale)
		const semanticScore =
			(source.semanticSimilarity || source.similarity || 0) * 10;

		// RRF score (0-1, converted to 0-5 scale)
		const rrfScore = (source.rrfScore || 0) * 5;

		// Combined score: intent (40%) + semantic (40%) + RRF (20%)
		// This prioritizes chunks that answer the question over chunks with high keyword matches
		const combinedScore =
			intentScore * 0.4 + semanticScore * 0.4 + rrfScore * 0.2;

		return combinedScore;
	}

	const citedSources: Array<{
		id: string | number;
		title: string;
		relevance?: number;
		similarity?: number;
		citation?: any;
		citationScore: number;
		rrfScore: number;
		chunkContent?: string;
		semanticSimilarity?: number;
	}> = [];
	const responseLower = fullResponseText.toLowerCase();
	const normalizedResponse = normalize(fullResponseText);

	for (const record of records) {
		let citationScore = 0;

		// Check for exact title match (primary citation method)
		const titleLower = record.title.toLowerCase();
		if (responseLower.includes(titleLower)) {
			citationScore += 10;
		}

		// Check for normalized title match (handles cleaned up filenames)
		const normalizedTitle = normalize(record.title);
		if (normalizedResponse.includes(normalizedTitle)) {
			citationScore += 8; // High score for normalized match
		}

		// Check for title in citation format (Source: Title)
		if (responseLower.includes(`(source: ${titleLower})`)) {
			citationScore += 10;
		}

		// Check for normalized title in citation format
		if (normalizedResponse.includes(`(source: ${normalizedTitle})`)) {
			citationScore += 8;
		}

		// Medium signal: Explicit ID mention (fallback for legacy)
		if (
			responseLower.includes(`id: ${record.id}`) ||
			responseLower.includes(`[${record.id}]`) ||
			responseLower.includes(`record ${record.id}`)
		) {
			citationScore += 5;
		}

		// Check for most title words present
		const titleWords = titleLower
			.split(/\s+/)
			.filter((word) => word.length > 3 && !commonWords.has(word));
		const titleMatches = titleWords.filter((word) =>
			responseLower.includes(word)
		);
		if (titleMatches.length >= Math.min(titleWords.length * 0.6, 3)) {
			citationScore += 3;
		}

		// Check for unique keywords from content
		if (record.note) {
			const noteWords = record.note
				.toLowerCase()
				.split(/\s+/)
				.filter((word) => word.length > 4 && !commonWords.has(word))
				.slice(0, 15);

			const noteMatches = noteWords.filter((word) =>
				responseLower.includes(word)
			);
			if (noteMatches.length >= 3) {
				citationScore += 1;
			}
		}

		// Only include if score is significant enough and has minimum relevance
		const minCitationScore = 5; // Increased from 3 to 5
		const minRrfScore = 0.01; // Minimum RRF score threshold
		const rrfScore = record.rrf_score || 0;

		if (citationScore >= minCitationScore && rrfScore >= minRrfScore) {
			citedSources.push({
				id: record.id,
				title: record.title,
				relevance: record.rrf_score || record.combined_score || record.rank,
				similarity: record.rrf_score
					? record.rrf_score * 30
					: record.semantic_similarity, // Convert RRF to similarity-like value for UI
				citation: record.citation, // Pass through citation data from hybrid search
				citationScore, // Store for sorting/deduplication
				rrfScore, // Store for sorting/deduplication
				chunkContent: record.note || "", // Store chunk content for query-intent matching
				semanticSimilarity: record.semantic_similarity || 0, // Store semantic similarity
			});
		}
	}

	// Deduplicate by file ID (keep the chunk that best answers the query)
	const uniqueSources = citedSources.reduce((acc: any[], source) => {
		const existing = acc.find((s) => s.id === source.id);
		if (!existing) {
			acc.push(source);
		} else {
			// NEW: Check if chunk content actually appears in AI response
			// This ensures we cite the page that contains the actual answer
			const aiResponseLower = fullResponseText.toLowerCase();
			const existingContent = (existing.chunkContent || "").toLowerCase();
			const sourceContent = (source.chunkContent || "").toLowerCase();

			// Extract key phrases from AI response (words/phrases that might be quoted)
			const extractKeyPhrases = (text: string): string[] => {
				// Extract quoted text, capitalized phrases, and significant words
				const quoted = text.match(/"([^"]+)"/g) || [];
				const capitalized =
					text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
				// Extract bullet points or list items (often contain specific answers)
				const bulletPoints = text.match(/[•\*\-]\s*([^\n]+)/g) || [];
				// Extract text after colons (often contains specific answers)
				const afterColons = text.match(/:\s*([^\n]+)/g) || [];
				const significantWords = text
					.toLowerCase()
					.split(/\s+/)
					.filter((w) => w.length > 3 && !commonWords.has(w))
					.slice(0, 15);

				return [
					...quoted.map((q) => q.replace(/"/g, "").toLowerCase()),
					...capitalized.map((c) => c.toLowerCase()),
					...bulletPoints.map((b) =>
						b
							.replace(/[•\*\-]\s*/, "")
							.toLowerCase()
							.trim()
					),
					...afterColons.map((a) => a.replace(/:\s*/, "").toLowerCase().trim()),
					...significantWords,
				].filter((phrase) => phrase.length > 2); // Filter out very short phrases
			};

			const keyPhrases = extractKeyPhrases(fullResponseText);

			// Count how many key phrases appear in each chunk
			const existingMatches = keyPhrases.filter((phrase) =>
				existingContent.includes(phrase)
			).length;
			const sourceMatches = keyPhrases.filter((phrase) =>
				sourceContent.includes(phrase)
			).length;

			// Prefer chunk with more matching phrases from AI response
			if (sourceMatches > existingMatches) {
				const index = acc.indexOf(existing);
				acc[index] = source;
			} else if (sourceMatches === existingMatches && sourceMatches > 0) {
				// If same number of matches, use relevance score as tiebreaker
				const existingRelevance = calculateChunkRelevance(
					existing,
					queryForSearch,
					queryType
				);
				const sourceRelevance = calculateChunkRelevance(
					source,
					queryForSearch,
					queryType
				);

				if (sourceRelevance > existingRelevance) {
					const index = acc.indexOf(existing);
					acc[index] = source;
				}
			} else {
				// Fallback to original logic if no content matches
				const existingRelevance = calculateChunkRelevance(
					existing,
					queryForSearch,
					queryType
				);
				const sourceRelevance = calculateChunkRelevance(
					source,
					queryForSearch,
					queryType
				);

				if (sourceRelevance > existingRelevance) {
					const index = acc.indexOf(existing);
					acc[index] = source;
				}
			}
		}
		return acc;
	}, []);

	// Sort by combined score: citation score first, then RRF score
	const sortedSources = uniqueSources
		.sort((a, b) => {
			// Primary sort: citation score (how explicitly mentioned)
			if (b.citationScore !== a.citationScore) {
				return b.citationScore - a.citationScore;
			}
			// Secondary sort: RRF score (relevance to query)
			return b.rrfScore - a.rrfScore;
		})
		// Limit to top 10 most relevant sources
		.slice(0, 10)
		.map(
			({
				citationScore,
				rrfScore,
				chunkContent,
				semanticSimilarity,
				...rest
			}) => rest
		); // Remove internal scores from final output

	console.log(
		`[ADMIN CHAT] Response generated with ${sortedSources.length} sources (filtered from ${citedSources.length} candidates)`
	);

	// Yield sources
	yield {
		type: "sources",
		sources: sortedSources,
	};

	// Yield final completion with token counts
	yield {
		type: "done",
		tokenCount: {
			input: analysisInputTokens + aiInputTokens,
			output: analysisOutputTokens + aiOutputTokens,
		},
	};
}

/**
 * Update search vectors for all chapter chunks (maintenance function)
 */
export async function updateSearchVectors(): Promise<void> {
	try {
		await prisma.$executeRaw`
      UPDATE chapter_chunks
      SET search_vector =
        setweight(to_tsvector('english', COALESCE((SELECT title FROM chapters WHERE id = chapter_id), '')), 'A') ||
        setweight(to_tsvector('english', COALESCE((SELECT s.name FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE c.id = chapter_id), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(content, '')), 'C')
      WHERE search_vector IS NULL OR content IS NOT NULL
    `;

		console.log(
			"[SEARCH VECTORS] Updated search vectors for all chapter chunks"
		);
	} catch (error) {
		console.error("Error updating search vectors:", error);
		throw new Error("Failed to update search vectors");
	}
}

// --- Exam Prep & Quiz Generation ---

export interface QuizGenerationConfig {
	subject: string;
	topic: string;
	chapterTitle?: string;
	difficulty: "easy" | "medium" | "hard";
	questionCount: number;
	questionTypes: (
		| "MCQ"
		| "TRUE_FALSE"
		| "FILL_IN_BLANK"
		| "SHORT_ANSWER"
		| "LONG_ANSWER"
	)[];
	context: string; // The content to generate questions from
}

const QuizQuestionSchema = z.object({
	question_text: z.string(),
	question_type: z.enum([
		"MCQ",
		"TRUE_FALSE",
		"FILL_IN_BLANK",
		"SHORT_ANSWER",
		"LONG_ANSWER",
	]),
	options: z
		.array(z.string())
		.optional()
		.describe("Array of options for MCQ/TF. Null for others."),
	correct_answer: z
		.union([z.string(), z.number(), z.array(z.string())])
		.describe("The correct answer. MUST be the exact string from the options array for MCQ/TrueFalse."),
	points: z.number().default(1),
	explanation: z.string().describe("Explanation of why the answer is correct"),
});

const QuizSchema = z.object({
	title: z.string(),
	description: z.string(),
	questions: z.array(QuizQuestionSchema),
});

// Schema for Batch Question Generation
const BatchQuestionSchema = z.object({
	questions: z.array(z.object({
		question_text: z.string().describe("The question text"),
		question_type: z.enum(["MCQ", "TRUE_FALSE", "FILL_IN_BLANK", "SHORT_ANSWER", "LONG_ANSWER"]),
		difficulty: z.enum(["easy", "medium", "hard"]),
		options: z.array(z.string()).optional().describe("Options for MCQ (4 options) or TRUE_FALSE (2 options)"),
		correct_answer: z.any().describe("The correct answer. For MCQ/TF/FIB: string. For Short/Long: model answer string."),
		explanation: z.string().describe("Detailed explanation of why the answer is correct"),
		points: z.number().describe("Points value: Easy=1, Medium=3, Hard=5")
	}))
});

export interface BatchQuestionConfig {
	context: string;
	chapterTitle: string;
	config: {
		easy: { [key in QuestionType]?: number };
		medium: { [key in QuestionType]?: number };
		hard: { [key in QuestionType]?: number };
	};
	examCategory?: ExamCategory; // Add this for better tailoring
}

/**
 * Generate a batch of questions based on specific counts per difficulty/type
 * Used for pre-generating the Question Bank
 */
export async function generateBatchQuestions(input: BatchQuestionConfig) {
	const { context, chapterTitle, config, examCategory } = input;

	// Construct a detailed request list
	let requestList: string[] = [];
	let totalQuestions = 0;

	(['easy', 'medium', 'hard'] as const).forEach(diff => {
		Object.entries(config[diff]).forEach(([type, count]) => {
			if (count && count > 0) {
				requestList.push(`${count} ${diff.toUpperCase()} ${type} questions`);
				totalQuestions += count;
			}
		});
	});

	if (totalQuestions === 0) return [];

	const prompt = `You are an expert educational content creator specializing in ${examCategory || 'Academic'} level content.
Your task is to generate exactly ${totalQuestions} questions for the chapter section: "${chapterTitle}".
The target audience level is: ${examCategory || 'General Academic'}.

=== SOURCE MATERIAL ===
${context}
=== END SOURCE MATERIAL ===

REQUIREMENTS:
Generate the following mix of questions based STRICTLY on the source material above:
${requestList.map(r => `• ${r}`).join('\n')}

RULES:
1. Questions must be high-quality, clear, and unambiguous.
2. COVERAGE: Ensure questions cover different parts of the text, not just the first paragraph.
3. DIFFICULTY:
   - EASY: Recall facts, definitions, simple concepts.
   - MEDIUM: Apply concepts, compare/contrast, explain "why".
   - HARD: Analyze, synthesize, evaluate, complex scenarios.
4. TYPES:
   - MCQ: Provide 4 distinct options. One correct.
   - TRUE_FALSE: Provide "True" and "False" as options.
   - FILL_IN_BLANK: The answer should be a specific word or short phrase from the text.
   - SHORT_ANSWER: Model answer should be 1-3 sentences.
   - LONG_ANSWER: Model answer should be a detailed paragraph.
5. EXPLANATION: Provide a helpful explanation for the correct answer.
6. SELF-CONTAINED QUESTIONS:
   - DO NOT reference external materials like "the provided algorithm", "the given diagram", "the figure", "the table", "Case 1/2/3", "the image", "the flowchart", "Exercise 1.2", "Note to Reader", etc.
   - Questions must be fully self-contained and understandable without any visual aids or external references.
   - Include all necessary context within the question itself.
7. PHRASING:
   - AVOID: "According to the text, ...", "The text states that ...", "In the exercise...", "According to the note..."
   - PREFER: Direct questions (e.g., "What is the time complexity of...?") OR "According to the chapter, ..." if needed.
   - Questions should sound natural and professional, as if from an exam paper.
8. NO META-QUESTIONS: Do not ask "What does the text say about...", just ask the question directly.

Output a JSON object with a "questions" array.`;

	try {
		// Get API key and initialize provider
		// We use a dummy keyId here or allow the system to pick a default
		const { apiKey } = await getProviderApiKey({ provider: "gemini" });
		const keyToUse = apiKey || process.env.GEMINI_API_KEY;

		if (!keyToUse) {
			throw new Error("No Gemini API key found");
		}

		const google = createGoogleGenerativeAI({ apiKey: keyToUse });

		// Model selection strategy
		const modelsToTry: string[] = [];
		const dbModels = await getActiveModelNames("gemini");
		modelsToTry.push(...dbModels);
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";
		modelsToTry.push(fallbackModel);
		const uniqueModels = [...new Set(modelsToTry)];

		for (const modelName of uniqueModels) {
			try {
				console.log(`[AI-BATCH] Attempting to generate questions with model: ${modelName}`);

				const result = await generateObject({
					model: google(modelName),
					schema: BatchQuestionSchema,
					prompt: prompt,
					mode: 'json',
				});

				// Normalize points based on question type (AI sometimes ignores this)
				const normalizedQuestions = result.object.questions.map(q => {
					let correctPoints = 1; // default
					switch (q.question_type) {
						case "MCQ":
						case "TRUE_FALSE":
						case "FILL_IN_BLANK":
							correctPoints = 1;
							break;
						case "SHORT_ANSWER":
							correctPoints = 3;
							break;
						case "LONG_ANSWER":
							correctPoints = 5;
							break;
					}

					if (q.points !== correctPoints) {
						console.log(`[AI-BATCH] Correcting points for ${q.question_type}: ${q.points} → ${correctPoints}`);
					}

					return { ...q, points: correctPoints };
				});

				return normalizedQuestions;
			} catch (error: any) {
				console.warn(`[AI-BATCH] Failed with model ${modelName}: ${error.message}`);
				// Continue to next model
			}
		}

		throw new Error("All models failed to generate questions");

	} catch (error) {
		console.error("[AI-SERVICE] Batch question generation failed:", error);
		return [];
	}
}

/**
 * Exam category types for difficulty calibration
 */
export type ExamCategory =
	| 'primary'      // Class 1-5
	| 'middle'       // Class 6-8
	| 'secondary'    // Class 9-10
	| 'senior'       // Class 11-12 (Board level)
	| 'entrance'     // JEE, NEET, CUET, etc. (Board level complexity)
	| 'competitive'  // UPSC, MPSC, Bank, SSC, Railways (Competitive level)
	| 'professional'; // CA, CS, GATE, etc.

/**
 * Get exam-appropriate difficulty guidelines based on program level/exam type
 * @param level - Program name (e.g., "Class 10", "UPSC Prelims") for auto-detection
 * @param difficulty - Difficulty level ("easy", "medium", "hard")
 * @param explicitExamCategory - Optional explicit exam category from program.exam_category (takes priority)
 */
function getGradeDifficultyGuidelines(level?: string, difficulty?: string, explicitExamCategory?: string): string {
	const levelStr = (level || "").toLowerCase();

	// Detect exam category from level string, or use explicit if provided
	let examCategory: ExamCategory = 'secondary'; // Default
	let audienceLabel = level || "General";

	// PRIORITY 1: Use explicit exam category if provided (from program.exam_category)
	if (explicitExamCategory) {
		// Map Syllabus exam_category values to our internal ExamCategory
		const categoryMap: Record<string, ExamCategory> = {
			'academic_board': 'secondary',  // Will be refined by grade detection below if needed
			'engineering': 'entrance',
			'medical': 'entrance',
			'government_prelims': 'competitive',
			'government_mains': 'competitive',
			'banking': 'competitive',
			'university': 'senior',
			'general': 'secondary'
		};

		const mappedCategory = categoryMap[explicitExamCategory];
		if (mappedCategory) {
			examCategory = mappedCategory;
			audienceLabel = level || explicitExamCategory;

			// For academic_board, continue to detect grade level for age-appropriate content
			// For other categories, skip auto-detection
			if (explicitExamCategory !== 'academic_board' && explicitExamCategory !== 'general') {
				// Skip the auto-detection block below by not entering any conditions
				// The examCategory and audienceLabel are already set
			}
		}
	}

	// PRIORITY 2: Auto-detect from level string (fallback)
	// Competitive exams (UPSC, MPSC, Bank, SSC, Railways, etc.)
	if (
		levelStr.includes('upsc') ||
		levelStr.includes('mpsc') ||
		levelStr.includes('psc') ||
		levelStr.includes('bank') ||
		levelStr.includes('ssc') ||
		levelStr.includes('railway') ||
		levelStr.includes('rrb') ||
		levelStr.includes('ibps') ||
		levelStr.includes('sbi') ||
		levelStr.includes('lic') ||
		levelStr.includes('civil service') ||
		levelStr.includes('government') ||
		levelStr.includes('govt') ||
		levelStr.includes('public service')
	) {
		examCategory = 'competitive';
		audienceLabel = level || "Competitive Exam Aspirants";
	}
	// Entrance exams (JEE, NEET, CUET, etc.) - Board level, not competitive
	else if (
		levelStr.includes('jee') ||
		levelStr.includes('neet') ||
		levelStr.includes('cuet') ||
		levelStr.includes('entrance') ||
		levelStr.includes('engineering') ||
		levelStr.includes('medical') ||
		levelStr.includes('clat') ||
		levelStr.includes('cat') ||
		levelStr.includes('mat') ||
		levelStr.includes('xat')
	) {
		examCategory = 'entrance';
		audienceLabel = level || "Entrance Exam Aspirants";
	}
	// Professional exams (CA, CS, GATE, etc.)
	else if (
		levelStr.includes('ca ') ||
		levelStr.includes('gate') ||
		levelStr.includes('net') ||
		levelStr.includes('ctet') ||
		levelStr.includes('professional')
	) {
		examCategory = 'professional';
		audienceLabel = level || "Professional Exam Aspirants";
	}
	// School levels - parse class number
	else {
		const match = levelStr.match(/(?:class|grade|std)\s*(\d+)|(\d+)(?:th|st|nd|rd)?/i);
		if (match) {
			const gradeNum = parseInt(match[1] || match[2], 10);
			if (gradeNum <= 5) {
				examCategory = 'primary';
				audienceLabel = `Class ${gradeNum} students (age ${gradeNum + 5}-${gradeNum + 6})`;
			} else if (gradeNum <= 8) {
				examCategory = 'middle';
				audienceLabel = `Class ${gradeNum} students (age ${gradeNum + 5}-${gradeNum + 6})`;
			} else if (gradeNum <= 10) {
				examCategory = 'secondary';
				audienceLabel = `Class ${gradeNum} students (age ${gradeNum + 5}-${gradeNum + 6})`;
			} else {
				examCategory = 'senior';
				audienceLabel = `Class ${gradeNum} students (age ${gradeNum + 5}-${gradeNum + 6})`;
			}
		}
	}

	// Difficulty definitions for each exam category
	const difficultyDefinitions: Record<ExamCategory, Record<string, string>> = {
		primary: {
			easy: `
**EASY (Primary School - Class 1-5)**:
- Direct recall of facts, names, basic definitions
- Simple "What is...?" or "Name the..." questions
- Fill blanks with words directly from the text
- True/False on straightforward facts
- NO abstract reasoning required`,
			medium: `
**MEDIUM (Primary School - Class 1-5)**:
- Simple application of one concept
- "Why does...?" with straightforward answers
- Fill blanks requiring slight inference
- Questions connecting two related facts
- Age-appropriate vocabulary only`,
			hard: `
**HARD (Primary School - Class 1-5)**:
- Apply concepts to new simple scenarios
- Compare two things with clear differences
- Simple cause-and-effect questions
- 2-step reasoning maximum
- Still age-appropriate vocabulary`
		},
		middle: {
			easy: `
**EASY (Middle School - Class 6-8)**:
- Direct recall of definitions, formulas, facts
- Fill blanks with key terms from chapter
- True/False on explicit statements
- "What is the definition of...?" questions
- NO application or analysis`,
			medium: `
**MEDIUM (Middle School - Class 6-8)**:
- Apply single rule/formula to straightforward problem
- Simple sentence transformations
- Explain "why" with 1-2 reasons
- Connect two related concepts
- NO multi-step reasoning`,
			hard: `
**HARD (Middle School - Class 6-8)**:
- Apply concepts to unfamiliar scenarios
- Multi-step problems (2-3 steps max)
- Compare and contrast two concepts
- Identify errors or exceptions
- Still age-appropriate complexity`
		},
		secondary: {
			easy: `
**EASY (Secondary School - Class 9-10)**:
- Direct recall of facts, definitions, formulas, rules
- Fill blanks with key terms
- Obvious correct option among distractors
- "State...", "Define...", "What is..." questions
- Answerable in under 30 seconds`,
			medium: `
**MEDIUM (Secondary School - Class 9-10)**:
- Apply ONE rule/concept to standard problem
- Simple transformations (active→passive, direct→indirect)
- Fill blanks requiring context understanding
- "Why does...?" with single clear reason
- Answerable in 1-2 minutes
- NO meta-analysis (don't ask WHY rules exist, just test APPLICATION)`,
			hard: `
**HARD (Secondary School - Class 9-10)**:
- Apply multiple concepts together
- Multi-step problems (3-4 steps)
- Identify exceptions or tricky cases
- Compare and contrast related concepts
- Board exam level challenging questions
- Answerable in 2-3 minutes`
		},
		senior: {
			easy: `
**EASY (Senior Secondary - Class 11-12, Board Level)**:
- Direct recall of definitions, theorems, standard formulas
- Fill blanks requiring subject knowledge
- Single-step application problems
- Basic concept questions
- Answerable in 30-45 seconds`,
			medium: `
**MEDIUM (Senior Secondary - Class 11-12, Board Level)**:
- Apply concepts to standard problems
- Multi-step problems (2-3 steps)
- Connect related concepts
- Board exam typical questions
- Numerical problems with moderate complexity
- Answerable in 2-3 minutes`,
			hard: `
**HARD (Senior Secondary - Class 11-12, Board Level)**:
- Complex multi-step problems (4-5 steps)
- Apply multiple concepts together
- Exception cases and edge conditions
- HOTS (Higher Order Thinking Skills) questions
- Board exam challenging questions
- Answerable in 3-5 minutes
- Still BOARD level, not competitive exam level`
		},
		entrance: {
			easy: `
**EASY (Entrance Exams - JEE/NEET/CUET, Board Level)**:
- NCERT-based direct questions
- Single concept application
- Formula-based straightforward problems
- Definition and fact recall
- Answerable in 30-60 seconds`,
			medium: `
**MEDIUM (Entrance Exams - JEE/NEET/CUET, Board Level)**:
- Standard NCERT application problems
- Multi-step problems (2-3 steps)
- Conceptual understanding questions
- Moderate numerical complexity
- Previous year easy-medium questions style
- Answerable in 2-3 minutes`,
			hard: `
**HARD (Entrance Exams - JEE/NEET/CUET, Board Level)**:
- Complex application problems
- Multi-concept integration (3-4 concepts)
- NCERT exemplar level questions
- Tricky but fair questions
- Previous year medium-hard questions style
- Answerable in 3-4 minutes
- Focus on conceptual depth, not tricks`
		},
		competitive: {
			easy: `
**EASY (Competitive Exams - UPSC/MPSC/Bank/SSC)**:
- Direct factual recall
- Current affairs basic facts
- Standard formulas and shortcuts
- Speed-based questions (30 seconds)
- Clear-cut answers with no ambiguity`,
			medium: `
**MEDIUM (Competitive Exams - UPSC/MPSC/Bank/SSC)**:
- Multi-statement questions (find correct/incorrect)
- Application of facts to scenarios
- Moderate calculation with shortcuts
- Paragraph-based inference questions
- Answerable in 45-60 seconds with practice
- Elimination strategy may be needed`,
			hard: `
**HARD (Competitive Exams - UPSC/MPSC/Bank/SSC)**:
- Complex multi-statement analysis
- Tricky options requiring careful elimination
- Data interpretation with multiple steps
- Analytical reasoning puzzles
- Previous year difficult questions style
- Requires 60-90 seconds even with practice
- Tests both knowledge AND exam strategy
- Deliberately confusing distractors allowed`
		},
		professional: {
			easy: `
**EASY (Professional Exams - CA/GATE/NET)**:
- Core concept definitions
- Standard problem patterns
- Direct application of rules
- Foundational knowledge testing`,
			medium: `
**MEDIUM (Professional Exams - CA/GATE/NET)**:
- Case-based application
- Multi-step standard problems
- Connecting theoretical concepts
- Previous year standard questions`,
			hard: `
**HARD (Professional Exams - CA/GATE/NET)**:
- Complex case analysis
- Multi-concept integration
- Edge cases and exceptions
- Advanced problem-solving
- Requires deep domain expertise`
		}
	};

	const selectedDifficulty = difficulty || 'medium';
	const guidelines = difficultyDefinitions[examCategory]?.[selectedDifficulty] || difficultyDefinitions.secondary.medium;

	return `**Target Audience**: ${audienceLabel}

=== DIFFICULTY CALIBRATION ===
${guidelines}

**CRITICAL**: Questions must match BOTH the exam type AND the difficulty level. 
- For SCHOOL exams: Questions should be appropriate for the student's age and curriculum.
- For ENTRANCE exams: Questions should be NCERT/syllabus-based, NOT tricky competitive style.
- For COMPETITIVE exams: Questions CAN include elimination strategies, time pressure, and tricky options.
=== END DIFFICULTY CALIBRATION ===`
}

export async function generateQuiz(
	config: QuizGenerationConfig,
	opts: { model?: string; keyId?: number; board?: string; level?: string; examCategory?: string } = {}
) {
	try {
		// Helper to delay
		const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

		// Calculate question type distribution
		const typeDistribution = config.questionTypes.map((type, idx) => {
			const count = Math.floor(config.questionCount / config.questionTypes.length) +
				(idx < config.questionCount % config.questionTypes.length ? 1 : 0);
			return `${count}x ${type}`;
		}).join(", ");
		const boardContext = opts.board ? `You are an expert ${opts.board} question setter.` : "";

		// Get grade-appropriate difficulty guidelines
		// Priority: explicit examCategory > auto-detect from level string
		const difficultyGuidelines = getGradeDifficultyGuidelines(opts.level, config.difficulty, opts.examCategory);

		const prompt = `${boardContext}
${difficultyGuidelines}

You are creating a **${config.difficulty.toUpperCase()}** difficulty quiz for "${config.subject}: ${config.topic}".

**Subject**: ${config.subject}
**Chapter**: ${config.topic}
**Difficulty**: ${config.difficulty.toUpperCase()}

=== EDUCATIONAL MATERIAL ===
The following is the study material from the textbook chapter on this topic. Use this to create meaningful questions that test students' understanding of the concepts, facts, and knowledge they should learn from this chapter.

${config.context}

=== END OF EDUCATIONAL MATERIAL ===

QUIZ REQUIREMENTS:
• Total: ${config.questionCount} questions (${typeDistribution})
• Types: ONLY ${config.questionTypes.join(", ")}
• ALL questions must test understanding of concepts and knowledge from the educational material above
• MCQ: 4 options, correct_answer = exact option text, 1 point
  ${config.difficulty === "hard" ? "• **HARD DIFFICULTY MCQs**: For hard difficulty, include 20-30% multi-select MCQs where multiple options are correct. Format: correct_answer = array of exact option texts (e.g., [\"A. option1\", \"B. option2\"]). Question text MUST include keywords like \"correct reason(s)\", \"correct options are\", or use pattern (i), (ii), (iii), (iv) to indicate multi-select." : ""}
• TRUE_FALSE: 2 options ("True", "False"), correct_answer = exact text, 1 point  
• FILL_IN_BLANK: correct_answer = missing word/phrase, 1 point
• SHORT_ANSWER: correct_answer = 2-3 sentence model answer, 2 points
• LONG_ANSWER: correct_answer = 5+ sentence detailed answer, 5 points

QUESTION COMPLEXITY BY DIFFICULTY:
${config.difficulty === "easy" ? `
• Ask ONLY: "What is...?", "Define...", "Name the...", "State the..."
• Fill blanks should use exact words from the material
• MCQ distractors should be obviously incorrect
• TRUE/FALSE should test explicit facts only
• NO "Why", "How", "Compare", "Explain" questions for Easy difficulty` : ""}
${config.difficulty === "medium" ? `
• Ask: "What happens when...?", "Fill in: [sentence with one blank]", simple "Why...?" questions
• Apply ONE rule or concept per question
• For grammar: test APPLICATION of rules, not explanation of rules
• For math/science: single-step or simple two-step problems
• NO "Compare and contrast", "Describe the relationship", "Analyze" questions
• NO questions asking students to explain WHY rules work (just test if they can USE rules)` : ""}
${config.difficulty === "hard" ? `
• Apply multiple concepts together
• Include tricky distractors that require careful thinking
• Test exceptions, edge cases, and common mistakes
• Multi-step reasoning allowed (but still grade-appropriate)
• "Compare", "Analyze", "What would happen if..." questions allowed
• Still must be solvable by target grade students, not graduate-level` : ""}

CRITICAL RULES - QUESTIONS MUST:
✓ Test actual subject knowledge and concepts
✓ Be completely self-contained and understandable without any visual aids
✓ Be answerable using the knowledge from the educational material
✓ Match the specified difficulty level EXACTLY (don't make Easy questions that are actually Medium)
✓ Be appropriate for the target grade level
✓ Include all necessary context within the question itself

STRICTLY PROHIBITED - DO NOT CREATE:
✗ Questions referencing unavailable materials: "the provided algorithm", "the given diagram", "the figure", "the table", "Case 1/2/3", "the image", "the flowchart", "the graph"
✗ Questions referencing specific exercises or activities: "In Exercise 1.2", "In Problem 3", "Activity X.X"
✗ Questions referencing side notes or boxes: "According to the 'NOTE TO THE READER'", "In the 'Did You Know' box"
✗ Questions about document structure (e.g., "what number appears in the content")
✗ Questions referencing "Activity X.X", "Figure X.X", "Table X.X", or "Box X.X" numbers
✗ Questions using phrases like "According to the text", "The text states", "the provided text", "the content above", "the material shown"
✗ Questions about formatting, layout, or visual presentation
✗ Questions that reference section numbers, page numbers, or document organization
✗ Meta-questions about the text itself rather than the subject matter
✗ Questions asking students to EXPLAIN grammar rules (for Easy/Medium - just test APPLICATION)
✗ Questions using advanced academic terminology inappropriate for the grade level

PHRASING GUIDELINES:
✓ GOOD: Direct questions (e.g., "What is the time complexity of binary search?")
✓ ACCEPTABLE: "According to the chapter, what is..."
✗ AVOID: "According to the text, what is..."
✗ AVOID: "The text states that..."
✗ AVOID: "In the exercise regarding..."
✗ AVOID: "Describe the relationship between..." (for Easy/Medium difficulty)
✗ AVOID: "Compare and contrast..." (for Easy/Medium difficulty)
✗ AVOID: "What is the purpose of..." when asking about grammar rules (for Easy/Medium)

EXAMPLES OF GRADE-APPROPRIATE QUESTIONS:
❌ BAD (Too complex for Medium): "Describe the relationship between Past Perfect and Simple Past tenses"
✅ GOOD (Medium level): "Fill in the blank: The train ____ (leave) before I reached the station."

❌ BAD (Too complex for Medium): "Explain why grammatical inversion is required in 'No sooner...than'"  
✅ GOOD (Medium level): "Complete: No sooner had he arrived ____ it started raining."

❌ BAD (Meta-question): "What is the purpose of placing 'had' before the subject?"
✅ GOOD (Application): "Choose the correct form: No sooner ____ he seen the teacher than he stood up. (a) has (b) had (c) have (d) having"

Remember: You are testing students' knowledge of ${config.subject} at the ${config.difficulty.toUpperCase()} level for their grade. Questions should be professional exam-style questions that stand alone without any external references.`;



		// Model fallback strategy
		// Priority: 1. Requested model (if any), 2. High Quality Default (3.0 Flash), 3. Admin-configured models, 4. .env fallback
		const modelsToTry: string[] = [];
		if (opts.model) modelsToTry.push(opts.model);

		// Prefer Gemini 3 Flash for quizzes (better reasoning for educational content)
		modelsToTry.push("gemini-3-flash-preview");

		// Add admin-configured models
		// Add admin-configured models (exclude image models)
		const dbModels = await getActiveModelNames("gemini");
		const textModels = dbModels.filter(m => !m.includes("-image"));
		modelsToTry.push(...textModels);

		// Add .env fallback
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";
		modelsToTry.push(fallbackModel);

		// Remove duplicates
		const uniqueModels = [...new Set(modelsToTry)];

		let lastError;

		for (const modelName of uniqueModels) {
			let attempts = 0;
			const maxAttempts = 3;
			const usedKeyIds: number[] = [];

			while (true) {
				attempts++;

				// keyId variable scope needs to be managed carefully 
				// We'll assign it from the fetch
				const { apiKey, keyId: currentKeyId, keyLabel } = await getProviderApiKey({
					provider: "gemini",
					keyId: opts.keyId,
					excludeKeyIds: usedKeyIds,
				});
				const keyToUse = apiKey || process.env.GEMINI_API_KEY;
				const currentLabel = keyLabel || (apiKey ? "Unknown DB Key" : "ENV Variable");

				if (!keyToUse) {
					// If no key available at all, break inner loop to let outer loop fail or continue
					lastError = new Error("No Gemini API key available");
					break;
				}

				const google = createGoogleGenerativeAI({ apiKey: keyToUse });

				try {
					console.log(`[AI-QUIZ] Attempting to generate quiz with model: ${modelName} (Key: "${currentLabel}" ID: ${currentKeyId || 'ENV'})`);

					const resultPromise = generateObject({
						model: google(modelName),
						schema: QuizSchema,
						prompt: prompt,
					});

					const result = await Promise.race([
						resultPromise,
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Quiz generation timed out after 90 seconds")), 90000)
						)
					]) as typeof resultPromise extends Promise<infer T> ? T : never;

					console.log(`[AI-QUIZ] Successfully generated quiz with ${result.object.questions.length} questions`);

					// Normalize points based on question type (AI sometimes ignores this)
					result.object.questions = result.object.questions.map(q => {
						let correctPoints = 1; // default
						switch (q.question_type) {
							case "MCQ":
							case "TRUE_FALSE":
							case "FILL_IN_BLANK":
								correctPoints = 1;
								break;
							case "SHORT_ANSWER":
								correctPoints = 2;
								break;
							case "LONG_ANSWER":
								correctPoints = 5;
								break;
						}

						if (q.points !== correctPoints) {
							console.log(`[AI-QUIZ] Correcting points for ${q.question_type}: ${q.points} → ${correctPoints}`);
						}

						return { ...q, points: correctPoints };
					});

					if (currentKeyId) await recordKeyUsage(currentKeyId, true);
					return result.object; // SUCCESS - Return immediately

				} catch (error: any) {
					if (currentKeyId) await recordKeyUsage(currentKeyId, false);

					console.warn(`[AI-QUIZ] Failed with model ${modelName} key ${currentKeyId}: ${error.message}`);
					lastError = error;

					const errorMsg = error.message || String(error);
					// Check for rate limit
					const isRateLimit =
						errorMsg.includes("429") ||
						errorMsg.includes("quota") ||
						errorMsg.includes("overloaded");

					if (isRateLimit && attempts < maxAttempts) {
						console.warn(`[AI-QUIZ] Rate limit hit. Rotating key...`);
						if (currentKeyId) usedKeyIds.push(currentKeyId);
						await delay(500);
						continue; // RETRY with new key
					}

					// Check for retryable model errors (404, etc)
					const isModelRetryable =
						errorMsg.includes("404") ||
						errorMsg.includes("not found");

					if (!isRateLimit && !isModelRetryable && opts.model) {
						// Non-retryable error on requested model
						throw error;
					}

					// Break inner loop to try next Model
					break;
				}
			} // End While
		}

		// If we get here, all models failed
		throw lastError || new Error("Failed to generate quiz with all available models");

	} catch (error: any) {
		console.error("Error generating quiz:", error);
		throw new Error(`Failed to generate quiz: ${error.message || String(error)}`);
	}
}

export async function gradeQuiz(
	questions: {
		question_text: string;
		user_answer: string;
		correct_answer: string;
		type: string;
	}[],
	opts: { model?: string; keyId?: number } = {}
) {
	try {
		// Filter for subjective questions that need AI grading
		const subjectiveQuestions = questions.filter((q) =>
			["SHORT_ANSWER", "LONG_ANSWER"].includes(q.type)
		);

		if (subjectiveQuestions.length === 0) {
			return [];
		}

		// Use priority: 1) opts.model, 2) admin-configured models, 3) .env fallback
		// Use priority: 1) opts.model, 2) Preferred (Gemini 3 Flash), 3) admin-configured models, 4) .env fallback
		const dbModels = await getActiveModelNames("gemini");
		const textModels = dbModels.filter(m => !m.includes("-image"));
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";

		// Prioritize Gemini 3 Flash Preview
		const preferredModel = "gemini-3-flash-preview";
		let modelName = opts.model;
		if (!modelName) {
			modelName = preferredModel; // Always try preferred first if not specified
		}

		let attempts = 0;
		const maxAttempts = 3;
		const usedKeyIds: number[] = [];

		while (true) {
			attempts++;
			const { apiKey, keyId, keyLabel } = await getProviderApiKey({
				provider: "gemini",
				keyId: opts.keyId,
				excludeKeyIds: usedKeyIds,
			});
			// Fallback to environment variable if no key found in database
			const keyToUse = apiKey || process.env.GEMINI_API_KEY;
			const currentLabel = keyLabel || (apiKey ? "Unknown DB Key" : "ENV Variable");

			if (!keyToUse) {
				throw new Error(
					"No Gemini API key found. Add a key in admin settings or set GEMINI_API_KEY."
				);
			}
			console.log(`[AI-GRADE] Grading batch with Key: "${currentLabel}" (${keyId || 'ENV'})`);
			const google = createGoogleGenerativeAI({ apiKey: keyToUse });

			const GradingSchema = z.object({
				grades: z.array(
					z.object({
						question_text: z.string(),
						is_correct: z.boolean(),
						score_percentage: z.number().min(0).max(100),
						feedback: z.string(),
					})
				),
			});

			const prompt = `Grade the following student answers based on the model answer.
            
            Questions:
            ${JSON.stringify(subjectiveQuestions, null, 2)}
            
            Provide a score (0-100) and feedback for each. Be lenient on phrasing but strict on factual accuracy.`;

			try {
				const result = await generateObject({
					model: google(modelName),
					schema: GradingSchema,
					prompt: prompt,
				});

				if (keyId) await recordKeyUsage(keyId, true);

				return result.object.grades;
			} catch (error: any) {
				if (keyId) await recordKeyUsage(keyId, false);

				const errorMsg = error.message || String(error);
				const isRateLimit = errorMsg.includes('429') || error.status === 429;

				if (isRateLimit && attempts < maxAttempts) {
					console.warn(`[GRADE] Key ${keyId} rate limited. Rotating...`);
					if (keyId) usedKeyIds.push(keyId);
					continue;
				}
				throw error;
			}
		}
	} catch (error) {
		console.error("Error grading quiz:", error);
		// Fallback: mark all as needing manual review or give full credit?
		// For now, throw error
		throw new Error("Failed to grade quiz");
	}
}

// --- Study Materials Generation ---

export interface StudyMaterialsConfig {
	subject: string;
	chapterTitle: string;
	content: string; // The chapter content to generate materials from
}

export interface AIStudyMaterials {
	summary_markdown: string;
	key_terms: { term: string; definition: string }[];
	flashcards: { front: string; back: string }[];
	youtube_search_queries: string[];
	mind_map_mermaid: string;
	important_formulas?: { name: string; formula: string; explanation: string }[];
}

const StudyMaterialSchema = z.object({
	summary_markdown: z.string().describe("A comprehensive 5-minute read summary of the chapter in markdown format"),
	key_terms: z.array(z.object({
		term: z.string(),
		definition: z.string(),
	})).describe("Glossary of important terms and concepts with clear definitions"),
	flashcards: z.array(z.object({
		front: z.string().describe("Question or term"),
		back: z.string().describe("Answer or definition"),
	})).min(10).max(20).describe("10-20 flashcard pairs for quick revision"),
	youtube_search_queries: z.array(z.string()).length(3).describe("3 precise search terms to find the best educational videos for this topic"),
	mind_map_mermaid: z.string().describe("Mermaid.js flowchart syntax representing the chapter's concept hierarchy"),
	important_formulas: z.array(z.object({
		name: z.string(),
		formula: z.string(),
		explanation: z.string(),
	})).optional().describe("Key formulas if this is a math/science chapter"),
});

export async function generateStudyMaterials(
	config: StudyMaterialsConfig,
	opts: { model?: string; keyId?: number } = {}
): Promise<AIStudyMaterials> {
	try {
		// Use getGeminiClient to respect admin-configured models
		const { client, keyId } = await getGeminiClient({
			provider: "gemini",
			keyId: opts.keyId,
		});

		// Use priority: 1) opts.model, 2) admin-configured models, 3) .env fallback
		// Use priority: 1) opts.model, 2) Preferred (Gemini 3 Flash), 3) admin-configured models, 4) .env fallback
		const dbModels = await getActiveModelNames("gemini");
		const textModels = dbModels.filter(m => !m.includes("-image"));
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";

		const preferredModel = "gemini-3-flash-preview";
		let modelName = opts.model;

		if (!modelName) {
			// If preferred model is in our active list or we just want to default to it
			modelName = preferredModel;
		}

		// Get API key for generateObject
		const { apiKey } = await getProviderApiKey({ provider: "gemini", keyId: opts.keyId });
		if (!apiKey) throw new Error("No Gemini API key found");
		const google = createGoogleGenerativeAI({ apiKey });

		// Limit content to avoid token limits
		const contentSnippet = config.content.substring(0, 40000);

		const prompt = `Generate comprehensive study materials for the following chapter.

Chapter: ${config.subject} - ${config.chapterTitle}

Content:
${contentSnippet}

Generate the following study materials:
1. A comprehensive summary (5-minute read) formatted in **Markdown**.
   - **Formatting:**
   - Use **bold** for key terms.
   - Use bullet points for lists.
   - Use \`code blocks\` for code.
   - **NO TABLES:** Do not use Markdown tables. They do not render well on mobile devices. Use bulleted lists or clear text structures instead.
   - **Newlines:** Use double newlines between paragraphs for better readability.
   - Use bullet points for lists.
   - Use **bold** for key concepts.
2. A glossary of important terms and definitions.
3. 10-20 flashcard pairs (front: question/term, back: answer/definition).
4. 3 specific YouTube search queries to find the best educational videos.
5. A Mermaid.js **flowchart** diagram to visualize the concepts.
   - Start with "graph TD" (Top-Down).
   - Use simple node labels like [Main Topic] --> [Subtopic].
   - AVOID special characters like (), {}, or quotes inside the node text.
   - Example:
     graph TD
       A[Main Topic] --> B[Subtopic 1]
       A --> C[Subtopic 2]
       B --> D[Detail 1]
6. If applicable, list important formulas with explanations.

Make the materials student-friendly, clear, and focused on exam preparation.`;

		const result = await (generateObject as any)({
			model: google(modelName),
			schema: StudyMaterialSchema,
			prompt: prompt,
			maxTokens: 60000, // Optimized for Gemini 3.0 Flash Preview (max 65,536)
		});

		if (keyId) await recordKeyUsage(keyId, true);

		return result.object as AIStudyMaterials;

	} catch (error) {
		console.error("Error generating study materials:", error);
		throw new Error("Failed to generate study materials");
	}
}

// ==========================================
// QUESTION BANK UPLOAD HELPERS
// ==========================================

const ExtractedQuestionSchema = z.object({
	question_text: z.string().describe("The full text of the question"),
	question_type: z.enum(["MCQ", "SHORT_ANSWER", "LONG_ANSWER", "TRUE_FALSE", "FILL_IN_THE_BLANK"]).describe("The type of question inferred from format"),
	points: z.number().optional().describe("Marks allocated to this question if specified"),
	options: z.array(z.string()).optional().describe("For MCQs, the list of options"),
	question_number: z.string().optional().describe("The question number as it appears in the paper (e.g. '1', '2(a)')"),
});

const ExtractedPaperSchema = z.object({
	questions: z.array(ExtractedQuestionSchema).describe("List of all extracted questions")
});

const AnswerGenerationSchema = z.object({
	correct_answer: z.string().describe("The correct answer to the question"),
	explanation: z.string().describe("Detailed explanation of why this is the correct answer"),
});

/**
 * Extracts structured questions from a parsed exam paper markdown
 */
export async function extractQuestionsFromPaper(pdfMarkdown: string) {
	try {
		console.log(`[AI-EXTRACT] Extracting questions from paper (${pdfMarkdown.length} chars)...`);

		// Use getGeminiClient to respect admin-configured keys/provider
		const { client, keyId } = await getGeminiClient({
			provider: "gemini",
		});

		// Dynamic model selection
		// Dynamic model selection
		const dbModels = await getActiveModelNames("gemini");
		const textModels = dbModels.filter(m => !m.includes("-image"));
		const configModel = await getSettingString("ai.model.extract_questions", "");
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";

		// Prioritize Gemini 3 Flash Preview if no config
		const preferredModel = "gemini-3-flash-preview";
		const baseModel = textModels[0] || fallbackModel;

		const modelName = configModel || preferredModel;

		const { apiKey } = await getProviderApiKey({ provider: "gemini", keyId: keyId ?? undefined });
		if (!apiKey) throw new Error("No Gemini API key found");
		const google = createGoogleGenerativeAI({ apiKey });

		const prompt = `
You are an expert exam paper parser. Your task is to extract questions from the provided exam paper content.

INPUT CONTENT:
${pdfMarkdown.slice(0, 30000)} // Limit context to avoid token limits

INSTRUCTIONS:
1. Identify all questions in the text.
2. CRITICAL: The paper may contain both English and Hindi text. IGNORE all Hindi text/translations. Extract ONLY the English version of the questions.
3. For each question, determine its type (MCQ, SHORT_ANSWER, LONG_ANSWER, etc.).
4. Extract the points/marks if mentioned (e.g. "[1 Mark]", "(3)").
5. For MCQs, extract all options into an array (English only).
   - **CRITICAL**: Remove ONLY the outermost option label (e.g., "A.", "B.", "(a)", "(b)", "1.", "2.").
   - **PRESERVE** internal numbering or references like "(i)", "(ii)", "1.", "2." if they are part of the answer content.
   - Example: If text is "A. (i) and (ii)", store "(i) and (ii)".
   - Example: If text is "(b) Statement 1 is correct", store "Statement 1 is correct".
6. Preserve the exact question text.
7. HANDLING DIAGRAMS:
   - If a question refers to a diagram (e.g., "In the given circuit"), look for any text description provided in the input.
   - If the diagram is described in text (e.g., "Circuit with 1 ohm and 2 ohm resistors"), include that description in the question text.
   - If the question is purely visual and impossible to solve without seeing the image, SKIP IT.
8. Ignore instructions like "All questions are compulsory" or section headers unless relevant.

OUTPUT FORMAT:
Return a JSON object with a "questions" array containing the extracted data.
`;

		const result = await generateObject({
			model: google(modelName),
			schema: ExtractedPaperSchema,
			prompt: prompt,
		});

		if (keyId) await recordKeyUsage(keyId, true);

		console.log(`[AI-EXTRACT] Successfully extracted ${result.object.questions.length} questions.`);
		return result.object.questions;

	} catch (error) {
		console.error("[AI-EXTRACT] Error extracting questions:", error);
		throw error;
	}
}

/**
 * Generates an answer for a question using chapter context
 */
export async function generateAnswerForQuestion(question: string, context: string, marks: number = 1) {
	try {
		// Use getGeminiClient to respect admin-configured keys/provider
		const { client, keyId } = await getGeminiClient({
			provider: "gemini",
		});

		// Dynamic model selection
		// Dynamic model selection
		const dbModels = await getActiveModelNames("gemini");
		const textModels = dbModels.filter(m => !m.includes("-image"));

		const configModel = await getSettingString("ai.model.generate_answer", "");
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";

		const preferredModel = "gemini-3-flash-preview";
		const modelName = configModel || preferredModel;

		const { apiKey } = await getProviderApiKey({ provider: "gemini", keyId: keyId ?? undefined });
		if (!apiKey) throw new Error("No Gemini API key found");
		const google = createGoogleGenerativeAI({ apiKey });

		const prompt = `
You are an expert subject tutor. Your task is to answer an exam question based strictly on the provided textbook content.

QUESTION:
${question}

MARKS: ${marks} (Answer length and detail should be appropriate for these marks)

TEXTBOOK CONTENT:
${context.slice(0, 20000)}

INSTRUCTIONS:
1. Read the question and the textbook content carefully.
2. **CRITICAL FOR MCQs**:
   - Select the correct option(s) from the provided choices.
   - The "correct_answer" field must contain the **EXACT TEXT** of the correct option(s).
   - If multiple options are correct (e.g., "Both A and B"), state that clearly using the option text.
3. Generate the CORRECT ANSWER based on the textbook.
4. Provide a detailed EXPLANATION referencing the textbook concepts.
5. If the answer cannot be found in the context, use your general knowledge but mention that it wasn't in the provided text.

OUTPUT FORMAT:
Return a JSON object with "correct_answer" and "explanation".
`;

		const result = await generateObject({
			model: google(modelName),
			schema: AnswerGenerationSchema,
			prompt: prompt,
		});

		if (keyId) await recordKeyUsage(keyId, true);

		return result.object;

	} catch (error) {
		console.error("[AI-SOLVE] Error generating answer:", error);
		// Return a fallback structure instead of throwing, to allow partial success
		return {
			correct_answer: "Could not generate answer.",
			explanation: "AI failed to generate an answer for this question."
		};
	}
}

const BatchAnswerSchema = z.object({
	answers: z.array(z.object({
		question_number: z.string().optional(),
		question_text_snippet: z.string().describe("First few words of question to identify it"),
		correct_answer: z.union([z.string(), z.array(z.string())]),
		explanation: z.string()
	}))
});

/**
 * Generates answers for a BATCH of questions using chapter context
 * Much more efficient than one-by-one
 */
export async function generateAnswersForBatch(
	questions: any[],
	context: string,
	metadata: { board?: string, level?: string, subject?: string, chapter?: string } = {}
) {
	try {
		if (questions.length === 0) return [];

		// Use getGeminiClient to respect admin-configured keys/provider
		const { client, keyId } = await getGeminiClient({
			provider: "gemini",
		});

		// Dynamic model selection
		// Dynamic model selection
		const dbModels = await getActiveModelNames("gemini");
		const textModels = dbModels.filter(m => !m.includes("-image"));

		// Try batch_answer setting, then answer setting, then fallback
		const batchModel = await getSettingString("ai.model.batch_answer", "");
		const answerModel = await getSettingString("ai.model.generate_answer", "");
		const fallbackModel = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.0-flash";

		const preferredModel = "gemini-3-flash-preview";
		const modelName = batchModel || answerModel || preferredModel;

		const { apiKey } = await getProviderApiKey({ provider: "gemini", keyId: keyId ?? undefined });
		if (!apiKey) throw new Error("No Gemini API key found");
		const google = createGoogleGenerativeAI({ apiKey });

		console.log(`[AI-SOLVE] Generating answers for batch of ${questions.length} questions using ${modelName}...`);

		const questionsText = questions.map((q, i) =>
			`Q${i + 1} [${q.points || 1} Marks] (${q.question_type || 'GENERAL'}): ${q.question_text}`
		).join("\n\n");

		const boardContext = metadata.board ? `You are an expert ${metadata.board} question setter.` : "You are an expert subject tutor.";
		const levelContext = metadata.level ? `The current level is ${metadata.level}.` : "";
		const subjectChapter = metadata.subject && metadata.chapter
			? `**Subject**: ${metadata.subject}\n**Chapter**: ${metadata.chapter}\n`
			: "";

		const prompt = `
${boardContext} ${levelContext}
Your task is to answer exam questions accurately based on the provided technical content.

${subjectChapter}
QUESTIONS:
${questionsText}

TEXTBOOK CONTENT:
${context.slice(0, 20000)}

INSTRUCTIONS:
1. Provide accurate, professional answers for each question.
2. Length should match weightage (marks).
3. **SOURCE PRIORITY**:
   - First, check the provided TEXTBOOK CONTENT.
   - If the answer is NOT in the textbook, **YOU MUST USE YOUR GENERAL KNOWLEDGE**.
   - **NEVER** return "Cannot be determined" or "Not found in text" for standard academic questions. Always provide the correct academic answer.
4. **LEVEL**: Keep answers at a ${metadata.level || "High School / CBSE"} level.

STRICTLY PROHIBITED IN EXPLANATIONS:
- Do not refer to "the provided text", "the context", "the above material", "Activity X.X", "Figure X.X", "Table X.X", "Reaction X.X", "Law X.X" or similar references.
- Do not say "According to the text" or "As mentioned in the chapter".
- Explanations must be self-contained and based on general subject knowledge + context facts, without meta-references.

OUTPUT FORMAT:
Return a JSON object with an "answers" array.
`;

		const result = await (generateObject as any)({
			model: google(modelName),
			schema: BatchAnswerSchema,
			prompt: prompt,
			maxTokens: 16384, // Higher limit for batch processing
		});

		if (keyId) await recordKeyUsage(keyId, true);

		return result.object.answers;

	} catch (error) {
		console.error("[AI-SOLVE] Error generating batch answers:", error);
		throw error;
	}
}
