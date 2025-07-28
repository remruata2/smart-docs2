import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { HybridSearchService, HybridSearchResult } from "./hybrid-search";
import {
  processChunkedAnalyticalQuery,
  isAnalyticalQuery,
} from "./chunked-processing";

// Developer logging toggle - set to true to see query logs in console
const DEV_LOGGING = true;

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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Array<{
    id: number;
    file_no: string;
    title: string;
  }>;
  tokenCount?: {
    input: number;
    output: number;
  };
}

export interface SearchResult {
  id: number;
  file_no: string;
  category: string;
  title: string;
  note: string | null;
  entry_date_real: Date | null;
  rank?: number; // For relevance ranking
  ts_rank?: number;
  semantic_similarity?: number;
  combined_score?: number;
}

/**
 * Analyze user query and extract search keywords using AI
 */
export async function analyzeQueryForSearch(
  currentQuery: string,
  conversationHistory: ChatMessage[] = []
): Promise<{
  coreSearchTerms: string;
  instructionalTerms: string;
  queryType:
    | "specific_search"
    | "follow_up"
    | "elaboration"
    | "general"
    | "recent_files"
    | "analytical_query";
  contextNeeded: boolean;
}> {
  try {
    // First check if this is a recent/latest files query
    const recentFilesPattern =
      /\b(recent|latest|newest|last|most recent)\s+(files?|records?|cases?|entries?)\b/i;
    const numberPattern =
      /\b(\d+)\s+(recent|latest|newest|last|most recent)\s+(files?|records?|cases?|entries?)\b/i;

    if (
      recentFilesPattern.test(currentQuery) ||
      numberPattern.test(currentQuery)
    ) {
      console.log("[QUERY ANALYSIS] Detected recent files query");
      return {
        coreSearchTerms: currentQuery, // Keep original for context
        instructionalTerms: "",
        queryType: "recent_files",
        contextNeeded: false,
      };
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });

    // Build conversation context
    const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
    const historyContext =
      recentHistory.length > 0
        ? `\nRECENT CONVERSATION:\n${recentHistory
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join("\n")}\n`
        : "";

    const prompt = `You are an AI assistant analyzing queries for a CID (Criminal Investigation Department) database search system.

${historyContext}

CURRENT USER QUERY: "${currentQuery}"

Your task is to:
1. Determine the query type
2. Extract the core search terms for database search
3. Extract the instructional terms for database search
4. Decide if conversation context is needed

Query Types:
- specific_search: Direct questions about cases, people, dates, etc. ("Details of case 123", "Who is John Doe?").
- analytical_query: Questions that require analysis, summarization, or finding patterns across multiple records (e.g., 'most common', 'how many', 'what is the trend', 'summarize').
- follow_up: Questions referring to previous results ("Who caught her?", "What happened next?").
- elaboration: Requests for more details ("Elaborate", "Tell me more", "Explain further").
- general: General questions or greetings.
- recent_files: Queries asking for recent/latest/newest files (handled separately).

IMPORTANT:
- If the query asks for "recent", "latest", "newest", or "most recent" files/records/cases, classify it as "recent_files".
- "coreSearchTerms" should be specific entities, names, IDs, or unique identifiers that directly map to data in the database. Do NOT include words that describe the type of query or action to be performed (e.g., 'summarize', 'analyze', 'case' when it's part of 'the case on X').
- "instructionalTerms" are words that describe the action (e.g., 'summarize', 'analyze') or the general type of record (e.g., 'case', 'incident') when they are not specific entities.

For follow_up and elaboration queries, you MUST extract keywords from the conversation history.

Respond in this exact JSON format:
{
  "coreSearchTerms": "extracted core search terms for database search",
  "instructionalTerms": "extracted instructional terms for database search",
  "queryType": "one of the five types above",
  "contextNeeded": true/false
}

Examples:
- "Cases from 2007?" → {"coreSearchTerms": "cases 2007", "instructionalTerms": "", "queryType": "specific_search", "contextNeeded": false}
- "Who caught her?" → {"coreSearchTerms": "caught arrest suspect", "instructionalTerms": "", "queryType": "follow_up", "contextNeeded": true}
- "Show me the most recent 3 files" → {"coreSearchTerms": "recent files", "instructionalTerms": "3", "queryType": "recent_files", "contextNeeded": false}
- "Latest cases" → {"coreSearchTerms": "latest cases", "instructionalTerms": "", "queryType": "recent_files", "contextNeeded": false}
- "Summarize the case on Zothansangi" → {"coreSearchTerms": "Zothansangi", "instructionalTerms": "summarize case", "queryType": "analytical_query", "contextNeeded": false}

`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Validate response
    if (!analysis.coreSearchTerms || !analysis.queryType) {
      throw new Error("Incomplete analysis from AI");
    }

    return {
      coreSearchTerms: analysis.coreSearchTerms,
      instructionalTerms: analysis.instructionalTerms || "",
      queryType: analysis.queryType,
      contextNeeded: analysis.contextNeeded || false,
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
        file_no: true,
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
  console.log(
    `[RELEVANCE-EXTRACTION] Extracting relevant information from ${records.length} records`
  );

  // Convert query to lowercase for matching
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2);

  // Keywords that indicate relevance
  const relevanceKeywords = [
    "victim",
    "suspect",
    "witness",
    "location",
    "place",
    "date",
    "time",
    "age",
    "name",
    "address",
    "phone",
    "incident",
    "crime",
    "case",
    "file",
    "number",
    "category",
    "description",
    "details",
  ];

  return records.map((record) => {
    const originalNote = record.note || "";
    const title = record.title || "";
    const category = record.category || "";

    // Check if record contains query words
    const containsQueryWords = queryWords.some(
      (word) =>
        title.toLowerCase().includes(word) ||
        originalNote.toLowerCase().includes(word) ||
        category.toLowerCase().includes(word)
    );

    // Check if record contains relevance keywords
    const containsRelevanceKeywords = relevanceKeywords.some(
      (keyword) =>
        title.toLowerCase().includes(keyword) ||
        originalNote.toLowerCase().includes(keyword) ||
        category.toLowerCase().includes(keyword)
    );

    // If record is relevant, keep full content
    if (containsQueryWords || containsRelevanceKeywords) {
      return record;
    }

    // For less relevant records, extract only key information
    const extractedNote = extractKeyInformation(originalNote, queryWords);

    return {
      ...record,
      note: extractedNote,
      // Add a flag to indicate this was processed
      _processed: true,
    };
  });
}

/**
 * Extract key information from a note based on query relevance
 */
function extractKeyInformation(note: string, queryWords: string[]): string {
  if (!note) return "";

  // Split note into sentences
  const sentences = note.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  // Score sentences based on relevance
  const scoredSentences = sentences.map((sentence) => {
    const sentenceLower = sentence.toLowerCase();
    let score = 0;

    // Score based on query word matches
    queryWords.forEach((word) => {
      if (sentenceLower.includes(word)) {
        score += 2; // Higher weight for query matches
      }
    });

    // Score based on relevance keywords
    const relevanceKeywords = [
      "victim",
      "suspect",
      "witness",
      "location",
      "place",
      "date",
      "time",
      "age",
      "name",
      "address",
      "phone",
      "incident",
      "crime",
      "case",
    ];

    relevanceKeywords.forEach((keyword) => {
      if (sentenceLower.includes(keyword)) {
        score += 1;
      }
    });

    return { sentence: sentence.trim(), score };
  });

  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3) // Keep top 3 most relevant sentences
    .map((item) => item.sentence)
    .filter((s) => s.length > 0);

  // If no relevant sentences found, return a summary
  if (topSentences.length === 0) {
    return `[Summary] ${note.substring(0, 200)}${
      note.length > 200 ? "..." : ""
    }`;
  }

  return topSentences.join(". ") + ".";
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
  }

  // Group records by category for smarter organization
  const recordsByCategory = processedRecords.reduce((acc, record) => {
    const category = record.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(record);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Create a structured index of all records for quick reference
  const recordIndex = processedRecords.map((record, index) => ({
    id: record.id,
    file_no: record.file_no,
    title: record.title,
    category: record.category || "Uncategorized",
    date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
    relevance: record.rank ? (record.rank * 100).toFixed(1) + "%" : "Unknown",
  }));

  // Build the full record details with optimized content
  const detailedRecords = processedRecords.map((record) => {
    let content = record.note || "No content available";

    // Avoid duplicating metadata if it's already in the note
    const fileNoPattern = new RegExp(
      `File No[^\\n]*${escapeRegExp(record.file_no)}`,
      "i"
    );
    const categoryPattern = new RegExp(
      `Category[^\\n]*${escapeRegExp(record.category)}`,
      "i"
    );
    const titlePattern = new RegExp(
      `Title[^\\n]*${escapeRegExp(record.title)}`,
      "i"
    );

    const hasMetadataPrefix =
      fileNoPattern.test(content.substring(0, 200)) ||
      categoryPattern.test(content.substring(0, 200)) ||
      titlePattern.test(content.substring(0, 200));

    return {
      id: record.id,
      file_no: record.file_no,
      title: record.title,
      category: record.category || "Uncategorized",
      date: record.entry_date_real?.toLocaleDateString() || "Unknown date",
      content: content,
      relevance: record.rank ? (record.rank * 100).toFixed(1) + "%" : "",
    };
  });

  // Build the optimized context
  return `
DATABASE CONTEXT:

=== OVERVIEW ===
Found ${processedRecords.length} relevant records from the CID database.
The records span ${Object.keys(recordsByCategory).length} categories.
Records are listed below ordered by relevance to your query.

=== RECORD INDEX ===
${recordIndex
  .map(
    (r, i) =>
      `[${i + 1}] File: ${r.file_no} | Title: ${r.title} | Category: ${
        r.category
      } | Date: ${r.date} | Relevance: ${r.relevance}`
  )
  .join("\n")}

=== FULL RECORD DETAILS ===
${detailedRecords
  .map(
    (record, index) => `
[RECORD ${index + 1}] (Relevance: ${record.relevance})
File: ${record.file_no}
Title: ${record.title}
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
  queryType: string = "specific_search"
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
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
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
  });

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
- The user is asking an analytical question that requires summarizing or finding patterns across multiple records.
- Analyze all the provided database records to identify trends, frequencies, and key data points related to the user's question.
- Synthesize your findings into a clear, structured summary.
- Use counts, lists, and direct data points to support your analysis (e.g., 'The most common location is X, appearing 5 times.').
- Present the information in an easy-to-understand format.
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

  const prompt = `You are a helpful AI assistant for the CID (Criminal Investigation Department) database system.\n\n${historyContext}\n\nCURRENT QUESTION: "${question}"\n\n${context}\n\nINSTRUCTIONS:\n${roleInstructions}\n\n- Always be professional and factual\n- If asked about specific cases, provide file numbers and relevant details\n- If no relevant information is found, say so clearly\n- Keep responses concise but informative\n- Use bullet points or numbered lists when presenting multiple items\n\nPlease provide a helpful response based on the database records above.`;

  // Estimate input tokens (prompt size)
  const inputTokens = estimateTokenCount(prompt);

  try {
    console.log(
      `[AI-GEN] Sending request to Gemini API, prompt size: ${prompt.length} characters`
    );
    const apiCallTiming = timeStart("Gemini API Call");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    timeEnd("Gemini API Call", apiCallTiming);

    // Estimate token counts
    const outputTokens = estimateTokenCount(text);

    devLog("AI response generated successfully", { inputTokens, outputTokens });

    return {
      text: text,
      inputTokens,
      outputTokens,
    };
  } catch (error: any) {
    console.error("AI response generation error:", error);
    if (error.message && error.message.includes("429")) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    throw new Error("Failed to generate AI response.");
  }
}

/**
 * Main chat function using enhanced search with conversation context
 */
export async function processChatMessageEnhanced(
  question: string,
  conversationHistory: ChatMessage[] = [],
  searchLimit: number = 100,
  useEnhancedSearch: boolean = true
): Promise<{
  response: string;
  sources: Array<{
    id: number;
    file_no: string;
    title: string;
    relevance?: number;
  }>;
  searchQuery: string;
  searchMethod:
    | "hybrid"
    | "semantic_fallback"
    | "tsvector_only"
    | "recent_files";
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
}> {
  console.log(`[ADMIN CHAT] User admin asked: "${question}"`);

  let analysisUsed = false;
  let queryForSearch = question;
  let queryType = "specific_search"; // Default
  let searchLimitForRecent = 10; // Default for recent files

  try {
    const analysis = await analyzeQueryForSearch(question, conversationHistory);
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
    console.log(
      "[CHAT ANALYSIS] Instructional terms:",
      `"${analysis.instructionalTerms}"`
    );
    console.log("[CHAT ANALYSIS] Context needed:", analysis.contextNeeded);

    analysisUsed = true;
    queryForSearch = analysis.coreSearchTerms;
    queryType = analysis.queryType;

    // Check for a number in instructional terms for recent files query
    if (analysis.queryType === "recent_files" && analysis.instructionalTerms) {
      const num = parseInt(analysis.instructionalTerms, 10);
      if (!isNaN(num)) {
        searchLimitForRecent = num;
      }
    }
  } catch (error) {
    console.error("Failed to analyze query with AI, using raw query.", error);
    // Fallback to using the raw question if analysis fails
    queryForSearch = question;
  }

  let records: SearchResult[] = [];
  let searchMethod:
    | "hybrid"
    | "semantic_fallback"
    | "tsvector_only"
    | "recent_files" = "hybrid";
  let searchStats;

  if (queryType === "recent_files") {
    records = await getRecentFiles(searchLimitForRecent);
    searchMethod = "recent_files";
    console.log(`[CHAT ANALYSIS] Found ${records.length} recent files.`);
  } else {
    // Use the new Hybrid Search Service
    const hybridSearchResponse = await HybridSearchService.search(
      queryForSearch,
      searchLimit
    );
    records = hybridSearchResponse.results;
    searchMethod = hybridSearchResponse.searchMethod;
    searchStats = hybridSearchResponse.stats;

    console.log(
      `[CHAT ANALYSIS] Hybrid search completed. Method: ${searchMethod}, Found: ${records.length} records.`
    );
  }

  // Check if this is an analytical query that needs chunked processing
  const needsChunkedProcessing = false; // Normal processing is more efficient for all queries
  let aiResponse;
  let contextTime = 0;
  let aiTime = 0;
  let context = "";

  // Use normal processing for all queries (analytical and non-analytical)
  console.log(
    `[CHAT PROCESSING] Starting context preparation for ${records.length} records`
  );
  const contextTiming = timeStart("Context Preparation");

  // Enable relevance extraction for large datasets to reduce token usage
  const useRelevanceExtraction = records.length > 50; // Enable for queries with more than 50 records
  context = prepareContextForAI(
    records,
    queryForSearch,
    useRelevanceExtraction
  );

  contextTime = timeEnd("Context Preparation", contextTiming);
  console.log(`[CHAT PROCESSING] Context size: ${context.length} characters`);
  if (useRelevanceExtraction) {
    console.log(
      `[CHAT PROCESSING] Relevance extraction enabled to reduce token usage`
    );
  }

  // Generate AI response
  console.log(`[CHAT PROCESSING] Starting AI response generation`);
  const aiTiming = timeStart("AI Response Generation");
  aiResponse = await generateAIResponse(
    question,
    context,
    conversationHistory,
    queryType
  );
  aiTime = timeEnd("AI Response Generation", aiTiming);

  // Extract sources from the context that were used in the AI response
  console.log(`[CHAT PROCESSING] Starting source extraction`);
  const sourceTiming = timeStart("Source Extraction");
  const citedSources = records
    .filter((record) => {
      const response = aiResponse.text.toLowerCase();
      const fileNo = record.file_no.toLowerCase();
      const title = record.title.toLowerCase();

      // Check for direct file number mention
      if (response.includes(fileNo)) return true;

      // Check for title mention (partial match)
      const titleWords = title.split(" ").filter((word) => word.length > 3);
      if (titleWords.some((word) => response.includes(word))) return true;

      // Check for content keywords from the record
      if (record.note) {
        const noteWords = record.note
          .toLowerCase()
          .split(/\s+/)
          .filter(
            (word) =>
              word.length > 4 &&
              ![
                "this",
                "that",
                "with",
                "from",
                "they",
                "were",
                "been",
                "have",
              ].includes(word)
          )
          .slice(0, 10); // Check first 10 meaningful words

        if (noteWords.some((word) => response.includes(word))) return true;
      }

      return false;
    })
    .map((record) => ({
      id: record.id,
      file_no: record.file_no,
      title: record.title,
      relevance: record.combined_score || record.rank,
    }));

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
      input: aiResponse.inputTokens,
      output: aiResponse.outputTokens,
    },
    stats: searchStats,
  };
}

/**
 * Update search vectors for all records (maintenance function)
 */
export async function updateSearchVectors(): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE file_list 
      SET search_vector = to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(note, '') || ' ' ||
        COALESCE(file_no, '')
      )
      WHERE search_vector IS NULL OR note IS NOT NULL
    `;

    console.log("[SEARCH VECTORS] Updated search vectors for all records");
  } catch (error) {
    console.error("Error updating search vectors:", error);
    throw new Error("Failed to update search vectors");
  }
}
