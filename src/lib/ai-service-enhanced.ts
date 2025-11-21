import { prisma } from "@/lib/prisma";
import {
	getGeminiClient,
	recordKeyUsage,
	getActiveModelNames,
	getProviderApiKey,
} from "@/lib/ai-key-store";
import { HybridSearchService } from "./hybrid-search";
import { getSettingInt } from "@/lib/app-settings";
import { processChunkedAnalyticalQuery } from "./chunked-processing";
import { ChartSchema } from "@/lib/chart-schema";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

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
const AI_API_TIMEOUT = 120000; // 120 seconds

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
	timestamp: Date;
	sources?: Array<{
		id: number;
		title: string;
		relevance?: number;
		similarity?: number; // For UI display (converted from RRF score or semantic_similarity)
		citation?: {
			pageNumber: number;
			imageUrl: string;
			boundingBox: any;
		};
	}>;
	tokenCount?: {
		input: number;
		output: number;
	};
	filters?: {
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
}

export interface SearchResult {
	id: number;
	category: string;
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

	// Citation data for split-screen view
	citation?: {
		pageNumber: number;
		imageUrl: string;
		boundingBox: any;
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

		const { client, keyId } = await getGeminiClient({
			provider: "gemini",
			keyId: opts.keyId,
		});
		const dbModels = await getActiveModelNames("gemini");
		const attemptModels = Array.from(
			new Set([opts.model, ...dbModels].filter(Boolean))
		);

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
		for (const modelName of attemptModels) {
			try {
				const model = client.getGenerativeModel({ model: modelName as string });
				console.log(
					`[AI] provider=gemini model=${modelName} keyId=${
						keyId ?? "env-fallback"
					}`
				);
				// Count input tokens using provider-native method
				try {
					const countRes: any = await model.countTokens({
						contents: [
							{
								role: "user",
								parts: [{ text: prompt }],
							},
						],
					});
					analysisInputTokens = (countRes?.totalTokens ??
						countRes?.totalTokenCount ??
						0) as number;
				} catch (e) {
					analysisInputTokens = estimateTokenCount(prompt);
					console.warn(
						"[QUERY ANALYSIS] countTokens failed; using heuristic",
						e
					);
				}
				const result = await withTimeout(
					model.generateContent(prompt),
					AI_API_TIMEOUT,
					"Query analysis AI call"
				);
				const response = await result.response;
				text = response.text().trim();
				// Capture output tokens from usage metadata if available
				const usage: any = (response as any)?.usageMetadata;
				analysisOutputTokens = (usage?.candidatesTokenCount ??
					usage?.totalTokenCount ??
					estimateTokenCount(text)) as number;
				if (keyId) await recordKeyUsage(keyId, true);
				lastError = null;
				break;
			} catch (e: any) {
				lastError = e;
				if (keyId) await recordKeyUsage(keyId, false);
				const errorMsg = e?.message || String(e);
				if (errorMsg.includes("timed out")) {
					console.warn(
						`[AI] Query analysis timeout after ${
							AI_API_TIMEOUT / 1000
						}s with model: ${modelName}`
					);
				} else {
					console.warn(`[AI] model attempt failed: ${modelName}`, e);
				}
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
 * Get recent files sorted by date
 */
export async function getRecentFiles(
	limit: number = 10
): Promise<SearchResult[]> {
	try {
		console.log(`[RECENT FILES] Fetching ${limit} most recent files`);

		const records = await prisma.fileList.findMany({
			select: {
				id: true,
				category: true,
				title: true,
				note: true,
				entry_date_real: true,
			},
			where: {
				entry_date_real: {
					not: null,
				},
			},
			orderBy: {
				entry_date_real: "desc",
			},
			take: limit,
		});

		console.log(`[RECENT FILES] Found ${records.length} recent files`);

		return records.map((record) => ({
			...record,
			rank: 1.0, // All recent files have equal relevance
		}));
	} catch (error) {
		console.error("Recent files query error:", error);
		throw new Error("Failed to fetch recent files");
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
	const categoryLower = (record.category || "").toLowerCase();

	queryWords.forEach((word) => {
		// Title matches get higher weight
		if (titleLower.includes(word)) {
			score += 5;
		}
		// Content matches
		if (noteLower.includes(word)) {
			score += 3;
		}
		// Category matches
		if (categoryLower.includes(word)) {
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
		return `[Summary] ${note.substring(0, 100)}${
			note.length > 100 ? "..." : ""
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

	// Group records by category for smarter organization
	const recordsByCategory = processedRecords.reduce((acc, record) => {
		const category = record.category || "Uncategorized";
		if (!acc[category]) acc[category] = [];
		acc[category].push(record);
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
			category: record.category || "Uncategorized",
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
				`[CONTEXT-PREP] Record ${record.id} (${record.title}): content length=${
					content.length
				}, preview=${content.substring(0, 200)}...`
			);
		}

		// Avoid duplicating metadata if it's already in the note
		const categoryPattern = new RegExp(
			`Category[^\\n]*${escapeRegExp(record.category)}`,
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
			category: record.category || "Uncategorized",
			date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
			content: content,
			relevance: relevanceDisplay,
		};
	});

	// Build the optimized context
	return `
DATABASE CONTEXT:

=== OVERVIEW ===
 Found ${processedRecords.length} relevant records from the Smart Docs database.
The records span ${Object.keys(recordsByCategory).length} categories.
Records are listed below ordered by relevance to your query.

  === RECORD INDEX ===
  ${recordIndex
		.map(
			(r, i) =>
				`[${i + 1}] File: ${r.title} | Category: ${r.category} | Date: ${
					r.date
				} | Relevance: ${r.relevance}`
		)
		.join("\n")}

=== FULL RECORD DETAILS ===
${detailedRecords
	.map(
		(record, index) => `
**File: ${record.title}** (Relevance: ${record.relevance})
Category: ${record.category}
Date: ${record.date}
Content: ${record.content}
---`
	)
	.join("\n")}

=== CATEGORY SUMMARY ===
${Object.entries(recordsByCategory)
	.map(([category, records]) => `${category}: ${records.length} records`)
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
	const dbModels = await getActiveModelNames("gemini");
	const attemptModels = Array.from(
		new Set([opts.model, ...dbModels].filter(Boolean))
	);

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
- **Goal:** Synthesize a high-level answer. Do not just list the files one by one.
- **Structure:**
  1. **Executive Summary:** A 2-sentence answer to the core question.
  2. **Key Findings:** Group information by themes (e.g., "Timeline of Events", "Financial Impact", "Involved Parties").
  3. **Data Table:** If numbers/dates are involved, create a Markdown table comparing them across records.
  4. **Source Breakdown:** Briefly mention which records contributed to which finding.
`;
			break;
		case "follow_up":
			roleInstructions = `
- This is a follow-up question referring to previous conversation.
- Use both the conversation history and database records to answer.
- Connect the current question to previous context.
`;
			break;
		case "elaboration":
			roleInstructions = `
- The user wants more detailed information about previous results.
- Provide comprehensive details from the database records.
- Expand on the information with additional context.
`;
			break;
		case "recent_files":
			roleInstructions = `
- The user asked for recent/latest files.
- Present the files in a clear, organized manner.
- Include file numbers, titles, categories, and dates.
- Mention they are sorted by most recent first.
`;
			break;
		default: // specific_search and general
			roleInstructions = `
- Answer the user's specific question using the provided database records.
- Be factual and cite relevant information by referencing file numbers.
- Provide clear, organized information.
`;
	}

	const prompt = `You are the AI Analyst for the Smart Docs system.
Your task is to answer the user's question using *only* the provided Database Context.

=== DATABASE CONTEXT ===
${context}

=== CONVERSATION HISTORY ===
${historyContext}

=== USER QUESTION ===
"${question}"

=== SYSTEM INSTRUCTIONS ===
1. **Strict Citations:** You MUST support every factual claim with a reference to the source file name/title.
   - Format: Use the file title/name directly, or (Source: Title).
   - Example: "The project was completed on July 4th (Source: Project Report 2024-001). The document indicates the budget was approved (Source: Budget Approval Memo)."
   - Always use the exact file title as shown in the context, not record numbers or IDs.

2. **Hybrid Synthesis:** The context contains both "Keyword Matches" (exact words) and "Semantic Matches" (related concepts).
   - If the user asks for a specific file, prioritize records with that exact file title/name.
   - If the user asks for a summary, synthesize information from multiple relevant records.
   - Always cite files by their title/name, not by record numbers.

3. **Formatting:**
   - Use Markdown tables for structured data (dates, names, amounts).
   - Use bullet points for lists.
   - **Bold** key entities (Names, IDs, Dates).

4. **Data Visualization:**
   - You have the capability to generate charts (bar, line, pie, area).
   - If the user asks to "visualize", "chart", "plot", or "graph" data, acknowledge the request.
   - The system will automatically detect this intent and generate the chart for you.
   - You do not need to generate ASCII charts; a real interactive chart will be rendered.

5. **Honesty:**
   - If the provided records do not contain the answer, state: "I cannot find information about [X] in the current retrieved documents."
   - Do not invent information.

${roleInstructions}

Answer:`;

	// Handle visualization queries using structured output
	if (queryType === "visualization") {
		try {
			console.log("[AI-GEN] Generating structured chart configuration...");
			// Use a model that supports structured output well
			const modelName = opts.model || "gemini-2.5-flash";

			const { apiKey } = await getProviderApiKey({ provider: "gemini" });
			const keyToUse = apiKey || process.env.GEMINI_API_KEY;

			if (!keyToUse) {
				throw new Error("No Gemini API key configured for chart generation");
			}

			const google = createGoogleGenerativeAI({
				apiKey: keyToUse,
			});

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
			console.log(
				`[AI-GEN] Sending request to Gemini API, model=${modelName}, prompt size: ${prompt.length} characters`
			);
			const apiCallTiming = timeStart("Gemini API Call");
			const model = client.getGenerativeModel({ model: modelName as string });
			// Use Gemini native token counter for input tokens
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
				// Fallback to heuristic only if countTokens fails
				inputTokens = estimateTokenCount(prompt);
				console.warn("[AI-GEN] countTokens failed; using heuristic", e);
			}
			const result = await withTimeout(
				model.generateContent(prompt),
				AI_API_TIMEOUT,
				`AI response generation (${modelName})`
			);
			const response = await result.response;
			const text = response.text();
			timeEnd("Gemini API Call", apiCallTiming);

			// Prefer usage metadata from Gemini for output tokens
			const usage: any = (response as any)?.usageMetadata;
			const outputTokens = (usage?.candidatesTokenCount ??
				usage?.totalTokenCount ??
				estimateTokenCount(text)) as number;

			devLog("AI response generated successfully", {
				inputTokens,
				outputTokens,
				modelName,
			});
			if (keyId) await recordKeyUsage(keyId, true);

			return {
				text: text,
				inputTokens,
				outputTokens,
			};
		} catch (error: any) {
			lastError = error;
			if (keyId) await recordKeyUsage(keyId, false);
			const errorMsg = error?.message || String(error);
			if (errorMsg.includes("timed out")) {
				console.warn(
					`[AI-GEN] Response generation timeout after ${
						AI_API_TIMEOUT / 1000
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
	throw new Error("Failed to generate AI response.");
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
	const dbModels = await getActiveModelNames("gemini");
	const attemptModels = Array.from(
		new Set([opts.model, ...dbModels].filter(Boolean))
	);

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
- **Goal:** Synthesize a high-level answer. Do not just list the files one by one.
- **Structure:**
  1. **Executive Summary:** A 2-sentence answer to the core question.
  2. **Key Findings:** Group information by themes (e.g., "Timeline of Events", "Financial Impact", "Involved Parties").
  3. **Data Table:** If numbers/dates are involved, create a Markdown table comparing them across records.
  4. **Source Breakdown:** Briefly mention which records contributed to which finding.
`;
			break;
		case "follow_up":
			roleInstructions = `
- This is a follow-up question referring to previous conversation.
- Use both the conversation history and database records to answer.
- Connect the current question to previous context.
`;
			break;
		case "elaboration":
			roleInstructions = `
- The user wants more detailed information about previous results.
- Provide comprehensive details from the database records.
- Expand on the information with additional context.
`;
			break;
		case "recent_files":
			roleInstructions = `
- The user asked for recent/latest files.
- Present the files in a clear, organized manner.
- Include file numbers, titles, categories, and dates.
- Mention they are sorted by most recent first.
`;
			break;
		default: // specific_search and general
			roleInstructions = `
- Answer the user's specific question using the provided database records.
- Be factual and cite relevant information by referencing file numbers.
- Provide clear, organized information.
`;
	}

	const prompt = `You are the AI Analyst for the Smart Docs system.
Your task is to answer the user's question using *only* the provided Database Context.

=== DATABASE CONTEXT ===
${context}

=== CONVERSATION HISTORY ===
${historyContext}

=== USER QUESTION ===
"${question}"

=== SYSTEM INSTRUCTIONS ===
1. **Strict Citations:** You MUST support every factual claim with a reference to the source file name/title.
   - Format: Use the file title/name directly, or (Source: Title).
   - Example: "The project was completed on July 4th (Source: Project Report 2024-001). The document indicates the budget was approved (Source: Budget Approval Memo)."
   - Always use the exact file title as shown in the context, not record numbers or IDs.

2. **Hybrid Synthesis:** The context contains both "Keyword Matches" (exact words) and "Semantic Matches" (related concepts).
   - If the user asks for a specific file, prioritize records with that exact file title/name.
   - If the user asks for a summary, synthesize information from multiple relevant records.
   - Always cite files by their title/name, not by record numbers.

3. **Formatting:**
   - Use Markdown tables for structured data (dates, names, amounts).
   - Use bullet points for lists.
   - **Bold** key entities (Names, IDs, Dates).

4. **Honesty:**
   - If the provided records do not contain the answer, state: "I cannot find information about [X] in the current retrieved documents."
   - Do not invent information.

${roleInstructions}

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

			// Use a model that supports structured output well
			const streamingModelName = opts.model || "gemini-1.5-pro";
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
		category?: string;
		userId?: number;
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
			imageUrl: string;
			boundingBox: any;
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
		const hasFilters = filters && (filters.category || filters.userId);
		if (queryType === "analytical_query" && hasFilters) {
			console.log(
				`[CHAT ANALYSIS] Analytical query with filters - retrieving all records matching filters for complete analysis`
			);
			const hybridSearchResponse = await HybridSearchService.search(
				"",
				effectiveSearchLimit,
				filters
			);
			records = hybridSearchResponse.results;
			searchMethod = "analytical_fallback";
			searchStats = hybridSearchResponse.stats;
			console.log(
				`[CHAT ANALYSIS] Retrieved ${records.length} records matching filters for analytical analysis`
			);
		} else {
			const hybridSearchResponse = await HybridSearchService.search(
				queryForSearch,
				effectiveSearchLimit,
				filters
			);
			records = hybridSearchResponse.results;
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
			filters
		);
		records = allRecordsResponse.results;
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
		"the",
		"and",
		"source",
		"based",
		"according",
		"provided",
		"found",
	]);

	/**
	 * Score chunk by query intent - determines how well a chunk answers the question type
	 */

	const citedSources = extractAndRankSources(
		records,
		aiResponse.text,
		queryForSearch,
		queryType,
		commonWords
	);

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
		`[TIMING-SUMMARY] - Total post-search time: ${
			contextTime + aiTime + sourceTime
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
		category?: string;
		userId?: number;
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
				imageUrl: string;
				boundingBox: any;
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
		const hasFilters = filters && (filters.category || filters.userId);
		if (queryType === "analytical_query" && hasFilters) {
			console.log(
				`[CHAT ANALYSIS] Analytical query with filters - retrieving all records matching filters for complete analysis`
			);
			const hybridSearchResponse = await HybridSearchService.search(
				"",
				effectiveSearchLimit,
				filters
			);
			records = hybridSearchResponse.results;
			searchMethod = "analytical_fallback";
			searchStats = hybridSearchResponse.stats;
			console.log(
				`[CHAT ANALYSIS] Retrieved ${records.length} records matching filters for analytical analysis`
			);
		} else {
			const hybridSearchResponse = await HybridSearchService.search(
				queryForSearch,
				effectiveSearchLimit,
				filters
			);
			records = hybridSearchResponse.results;
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
			filters
		);
		records = allRecordsResponse.results;
		searchMethod = "analytical_fallback";
		searchStats = allRecordsResponse.stats;
		console.log(
			`[CHAT ANALYSIS] Fallback retrieved ${records.length} records for analytical analysis`
		);
	}

	// Yield progress after search completes
	yield {
		type: "progress",
		progress: `Found ${records.length} record${
			records.length !== 1 ? "s" : ""
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
			progress: `Preparing context from ${records.length} record${
				records.length !== 1 ? "s" : ""
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
		"date",
		"time",
		"place",
		"report",
		"against",
		"under",
		"about",
		"information",
		"data",
		"the",
		"and",
		"source",
		"based",
		"according",
		"provided",
		"found",
	]);

	// Use centralized evidence-based extraction

	const sortedSources = extractAndRankSources(
		records,
		fullResponseText,
		queryForSearch,
		queryType,
		commonWords
	);

	console.log(
		`[ADMIN CHAT] Response generated with ${sortedSources.length} sources`
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
 * Update search vectors for all records (maintenance function)
 */
export async function updateSearchVectors(): Promise<void> {
	try {
		await prisma.$executeRaw`
      UPDATE file_list
      SET search_vector =
        setweight(to_tsvector('english', COALESCE(title, '')),   'A') ||
        setweight(to_tsvector('english', COALESCE(category, '')),'B') ||
        setweight(to_tsvector('english', COALESCE(note, '')),    'C')
      WHERE search_vector IS NULL OR note IS NOT NULL
    `;

		console.log("[SEARCH VECTORS] Updated search vectors for all records");
	} catch (error) {
		console.error("Error updating search vectors:", error);
		throw new Error("Failed to update search vectors");
	}
}

/**
 * CENTRALIZED HELPER: Evidence-Based Source Extraction with Final Score Logging
 * Logic:
 * 1. Identify specific data points (names, times, numbers) in the AI's answer.
 * 2. Filter sources that actually contain those data points.
 * 3. Deduplicate by File + Page.
 * 4. Rank by evidence count and score.
 * 5. Dynamic Cutoff: Stop listing sources when quality drops significantly below the top result.
 */

function extractAndRankSources(
	records: SearchResult[],
	responseText: string,
	query: string,
	queryType: string,
	commonWords: Set<string>
): Array<any> {
	const responseLower = responseText.toLowerCase();

	// --- 1. Extract Evidence Terms ---
	const extractEvidenceTerms = (text: string): string[] => {
		const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
		const dataPoints =
			text.match(
				/\b\d+(?::\d{2})?|noon|midnight|am|pm|\$\d+|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/gi
			) || [];
		const phrases =
			text.match(/(?:due to|because of|using|via)\s+([^.,!]{3,20})/gi) || [];

		return [
			...properNouns,
			...dataPoints,
			...phrases.map((p) =>
				p.replace(/^(due to|because of|using|via)\s+/i, "").trim()
			),
		]
			.map((t) => t.toLowerCase().trim())
			.filter((t) => t.length > 2 && !commonWords.has(t));
	};

	const evidenceTerms = extractEvidenceTerms(responseText);
	// DEBUG LOG: Evidence terms
	console.log(`[CITATION-DEBUG] Evidence Terms:`, evidenceTerms);

	// --- 2. Initial Candidate Scoring ---
	const candidates = records.map((record) => {
		const title = record.title.toLowerCase();
		const content = (record.note || "").toLowerCase();
		let score = 0;
		let hasEvidence = false;

		// A. Evidence Check
		if (evidenceTerms.some((term) => content.includes(term))) {
			score += 10;
			hasEvidence = true;
		}

		// B. Title Match (Tie-breaker only)
		if (responseLower.includes(title)) score += 2;

		// C. Explicit Citation
		if (responseLower.includes(`(source: ${title})`)) score += 5;

		// D. Keyword Matches
		if (record.note) {
			const noteWords = record.note
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 4 && !commonWords.has(w))
				.slice(0, 15);
			const noteMatches = noteWords.filter((w) => responseLower.includes(w));
			if (noteMatches.length >= 2) score += 2;
		}

		return {
			id: record.id,
			title: record.title,
			relevance: record.rrf_score || record.combined_score || record.rank,
			citationScore: score, // Internal Evidence Score
			rrfScore: record.rrf_score || 0, // Search Confidence
			chunkContent: record.note || "",
			citation: record.citation,
			hasEvidence: hasEvidence,
			evidenceCount: 0,
			semanticSimilarity: record.semantic_similarity || 0,
		};
	});

	// --- 3. Filter, Deduplicate & Sort ---
	const processedCandidates = candidates
		.filter((source) => {
			const passed =
				(source.citationScore >= 5 && source.rrfScore >= 0.01) ||
				(source.hasEvidence && source.citationScore >= 4);

			// Log drops only if they had some score but failed thresholds
			if (!passed && source.citationScore > 2) {
				console.log(
					`[CITATION-DROP] "${source.title}" (Pg ${source.citation?.pageNumber}) dropped. Score: ${source.citationScore}, Evidence: ${source.hasEvidence}`
				);
			}
			return passed;
		})
		.filter(
			(source, index, self) =>
				index ===
				self.findIndex(
					(s) =>
						s.id === source.id &&
						s.citation?.pageNumber === source.citation?.pageNumber
				)
		);

	const sortedCandidates = processedCandidates.sort((a, b) => {
		const contentA = (a.chunkContent || "").toLowerCase();
		const contentB = (b.chunkContent || "").toLowerCase();
		const evidenceCountA = evidenceTerms.filter((t) =>
			contentA.includes(t)
		).length;
		const evidenceCountB = evidenceTerms.filter((t) =>
			contentB.includes(t)
		).length;

		a.evidenceCount = evidenceCountA;
		b.evidenceCount = evidenceCountB;

		if (evidenceCountB !== evidenceCountA)
			return evidenceCountB - evidenceCountA;
		if (b.citationScore !== a.citationScore)
			return b.citationScore - a.citationScore;
		return b.rrfScore - a.rrfScore;
	});

	// --- 4. Dynamic Cutoff & Final Selection ---
	if (sortedCandidates.length === 0) return [];

	const topResult = sortedCandidates[0];
	const topScore = topResult.citationScore;
	const strictMode = topResult.hasEvidence;

	const finalSelection = sortedCandidates.filter((source, index) => {
		if (index === 0) return true;
		if (index >= 5) return false;

		const scoreDrop = source.citationScore < topScore * 0.5;
		const evidenceDrop = strictMode && !source.hasEvidence;

		if (evidenceDrop) {
			console.log(
				`[CITATION-CUT] "${source.title}" removed: No evidence vs Top Result`
			);
			return false;
		}
		if (scoreDrop) {
			console.log(
				`[CITATION-CUT] "${source.title}" removed: Low score (${source.citationScore}) vs Top (${topScore})`
			);
			return false;
		}
		return true;
	});

	// --- 5. LOG FINAL SELECTED SCORES ---
	console.log(`[CITATION-FINAL] Selected ${finalSelection.length} sources:`);
	finalSelection.forEach((s, i) => {
		console.log(
			`  #${i + 1}: "${s.title}" (Pg ${s.citation?.pageNumber}) | Score: ${
				s.citationScore
			} | Evidence: ${s.hasEvidence} | RRF: ${s.rrfScore?.toFixed(4)}`
		);
	});

	return finalSelection.map(
		({
			hasEvidence,
			evidenceCount,
			citationScore, // We remove this from the return object to match interface
			...rest
		}) => {
			return rest;
		}
	);
}
