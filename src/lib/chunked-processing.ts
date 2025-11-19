import { SearchResult, ChatMessage } from "./ai-service-enhanced";
import { generateAIResponse } from "./ai-service-enhanced";

// Server-safe implementation - no browser globals

// Constants for chunked processing
const CHUNK_SIZE = 15; // Reduced from 20 for better performance
const MAX_CONCURRENT_REQUESTS = 3; // Reduced from 5 to avoid rate limits
const LARGE_CONTEXT_THRESHOLD = 8000; // Warn if final context exceeds this (in characters)

/**
 * Result from processing a single chunk
 */
interface ChunkResult {
	text: string;
	inputTokens: number;
	outputTokens: number;
	error: boolean;
	errorMessage?: string;
}

/**
 * Generate smart extraction prompt based on query type
 */
function generateExtractionPrompt(question: string): string {
	const lowerQuestion = question.toLowerCase();

	// Count/statistical queries - need only IDs and categories
	if (lowerQuestion.match(/\b(count|how many|number of|total)\b/)) {
		return `From these records, extract ONLY: Case ID and Category.
Format each as: "ID: [id], Category: [category]"
One line per record. No additional text or narrative.`;
	}

	// List queries - need structured data
	if (lowerQuestion.match(/\b(list|show all|give me all|display)\b/)) {
		return `From these records, extract ONLY: ID, Title, Date.
Format as: "ID: [id] | Title: [title] | Date: [date]"
One line per record. Be concise. No narrative.`;
	}

	// Age-related queries - need names and ages
	if (lowerQuestion.match(/\b(age|years old|victim.*age|suspect.*age)\b/)) {
		return `From these records, extract ONLY names and ages of victims/suspects.
Format as: "Name (Age: X)" or "Name (Age: Unknown)" if not found.
One per line. Omit entries without names. No other text.`;
	}

	// Victim and suspect queries
	if (lowerQuestion.match(/\b(victim|suspect)\b.*\b(name|who|person)/)) {
		return `From these records, extract ONLY victim and suspect information.
Format as:
- Victim: [name], Age: [age]
- Suspect: [name], Age: [age]
One set per record. Mark as "Unknown" if not found. Keep it concise.`;
	}

	// Location/place queries
	if (lowerQuestion.match(/\b(location|place|where|address)\b/)) {
		return `From these records, extract ONLY locations/places mentioned.
Format as: "Case ID: [id] | Location: [location]"
One line per record. Be specific. No narrative.`;
	}

	// Summary/pattern/trend queries - need key data points
	if (lowerQuestion.match(/\b(summar|pattern|trend|distribution|analysis)\b/)) {
		return `From these records, extract key data points relevant to: "${question}"
Format as concise bullet points. Include:
- Case IDs
- Relevant categories/attributes
- Key numbers or facts
Raw data only - analysis will come later. Be concise.`;
	}

	// Group by queries
	if (
		lowerQuestion.match(
			/\b(group by|grouped by|organize by|by category)\b/
		)
	) {
		return `From these records, extract: ID, relevant grouping field (category), and title.
Format as: "[grouping]: ID [id] - [title]"
One line per record. Keep it structured and concise.`;
	}

	// Default - generic extraction with emphasis on conciseness
	return `From these records, extract information relevant to: "${question}"
Format as structured bullet points. Include case IDs for reference.
Be concise - extract key data only. Analysis comes later.
Keep responses short - aim for 2-3 lines per record max.`;
}

/**
 * Progress callback type
 */
type ProgressCallback = (message: string) => void;

/**
 * Process chunks with concurrency limiting and token tracking
 */
async function processChunksWithConcurrency(
	chunks: SearchResult[][],
	extractionPrompt: string,
	conversationHistory: ChatMessage[],
	onProgress?: ProgressCallback
): Promise<ChunkResult[]> {
	const results: ChunkResult[] = [];

	// Process chunks in batches to limit concurrency
	for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_REQUESTS) {
		const batch = chunks.slice(i, i + MAX_CONCURRENT_REQUESTS);
		const batchPromises = batch.map((chunk, batchIndex) =>
			processChunk(
				chunk,
				i + batchIndex,
				chunks.length,
				extractionPrompt,
				conversationHistory
			)
		);

		const batchNum = Math.floor(i / MAX_CONCURRENT_REQUESTS) + 1;
		const totalBatches = Math.ceil(chunks.length / MAX_CONCURRENT_REQUESTS);

		console.log(
			`[CHUNKED-PROCESSING] Processing batch ${batchNum}/${totalBatches} with ${batch.length} chunks`
		);

		// Report progress
		if (onProgress) {
			const processedSoFar = i;
			const totalChunks = chunks.length;
			onProgress(
				`Processing chunks ${processedSoFar + 1}-${Math.min(
					processedSoFar + batch.length,
					totalChunks
				)} of ${totalChunks}...`
			);
		}

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);
	}

	return results;
}

/**
 * Prepare context for a chunk of records
 */
function prepareContextForChunk(records: SearchResult[]): string {
	if (records.length === 0) {
		return "No records in this chunk.";
	}

	// Create a structured context for this chunk
	let context = `CHUNK CONTEXT (${records.length} records):\n\n`;

	// Add record index for quick reference
	context += "RECORD INDEX:\n";
	records.forEach((record, index) => {
		context += `[${index + 1}] Title: ${record.title} | Category: ${
			record.category || "Uncategorized"
		} | Date: ${
			record.entry_date_real?.toLocaleDateString() || "Unknown date"
		}\n`;
	});

	// Add full record details
	context += "\nDETAILED RECORDS:\n";
	records.forEach((record, index) => {
		const content = record.note || "No content available";

		context += `\n[RECORD ${index + 1}]`;
		context += `\nTitle: ${record.title}`;
		context += `\nCategory: ${record.category || "Uncategorized"}`;
		context += `\nDate: ${
			record.entry_date_real?.toLocaleDateString() || "Unknown date"
		}`;
		context += `\nContent: ${content}`;
		context += "\n---\n";
	});

	return context;
}

/**
 * Process a single chunk of records with proper error handling and token tracking
 */
async function processChunk(
	chunk: SearchResult[],
	index: number,
	totalChunks: number,
	extractionPrompt: string,
	conversationHistory: ChatMessage[]
): Promise<ChunkResult> {
	console.log(
		`[CHUNKED-PROCESSING] Starting chunk ${index + 1}/${totalChunks} with ${
			chunk.length
		} records`
	);
	const startTime = Date.now();

	try {
		const chunkContext = prepareContextForChunk(chunk);

		// FIX #4: Pass conversation history to chunks for context awareness
		const chunkResponse = await generateAIResponse(
			extractionPrompt,
			chunkContext,
			conversationHistory, // ✅ Now includes conversation history
			"analytical_query"
		);

		const elapsed = Date.now() - startTime;
		console.log(
			`[CHUNKED-PROCESSING] Completed chunk ${
				index + 1
			}/${totalChunks} in ${elapsed}ms (tokens: ${
				chunkResponse.inputTokens
			} in, ${chunkResponse.outputTokens} out)`
		);

		// FIX #1 & #2: Return proper result with tokens and error status
		return {
			text: chunkResponse.text,
			inputTokens: chunkResponse.inputTokens || 0,
			outputTokens: chunkResponse.outputTokens || 0,
			error: false,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error(
			`[CHUNKED-PROCESSING] ❌ Error processing chunk ${
				index + 1
			}/${totalChunks}:`,
			errorMessage
		);

		// FIX #2: Return empty text and mark as error (don't pollute data with error messages!)
		return {
			text: "",
			inputTokens: 0,
			outputTokens: 0,
			error: true,
			errorMessage,
		};
	}
}

/**
 * Process records in parallel chunks for analytical queries
 * FIX #4: Added conversationHistory parameter
 */
export async function processChunkedAnalyticalQuery(
	question: string,
	records: SearchResult[],
	conversationHistory: ChatMessage[] = [],
	onProgress?: ProgressCallback
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
	const chunks = [];
	const recordCount = records.length;

	// Divide records into chunks
	for (let i = 0; i < recordCount; i += CHUNK_SIZE) {
		chunks.push(records.slice(i, i + CHUNK_SIZE));
	}

	console.log(
		`[CHUNKED-PROCESSING] Processing ${recordCount} records in ${chunks.length} chunks with max ${MAX_CONCURRENT_REQUESTS} concurrent requests`
	);

	// Report initial progress
	if (onProgress) {
		onProgress(
			`Processing ${recordCount} records in ${chunks.length} chunks...`
		);
	}

	// FIX #3: Generate smart extraction prompt based on query type
	const extractionPrompt = generateExtractionPrompt(question);
	console.log(
		`[CHUNKED-PROCESSING] Using extraction strategy: ${extractionPrompt
			.split("\n")[0]
			.substring(0, 80)}...`
	);

	// FIX #1: Track tokens from ALL chunks
	let totalInputTokens = 0;
	let totalOutputTokens = 0;

	// Process chunks with concurrency limiting
	const chunkStartTime = Date.now();
	const chunkResults = await processChunksWithConcurrency(
		chunks,
		extractionPrompt,
		conversationHistory,
		onProgress
	);
	const chunkProcessingTime = Date.now() - chunkStartTime;

	// FIX #1: Accumulate tokens from all chunks
	chunkResults.forEach((result) => {
		totalInputTokens += result.inputTokens;
		totalOutputTokens += result.outputTokens;
	});

	// FIX #2: Check for failed chunks and handle gracefully
	const failedChunks = chunkResults.filter((r) => r.error);
	const successfulChunks = chunkResults.filter((r) => !r.error);

	if (failedChunks.length > 0) {
		console.warn(
			`[CHUNKED-PROCESSING] ⚠️ ${failedChunks.length}/${chunks.length} chunks failed. Results may be incomplete.`
		);
		failedChunks.forEach((chunk, idx) => {
			console.warn(
				`[CHUNKED-PROCESSING] Failed chunk ${idx + 1}: ${chunk.errorMessage}`
			);
		});
	}

	// Extract only successful chunk data
	const extractedData = successfulChunks.map((r) => r.text);

	console.log(
		`[CHUNKED-PROCESSING] All chunks processed in ${chunkProcessingTime}ms (${successfulChunks.length}/${chunks.length} successful). Total tokens from chunks: ${totalInputTokens} in, ${totalOutputTokens} out`
	);

	// FIX #2 & #5: Build final context with warnings and monitoring
	let finalContext = `Here is data extracted from ${successfulChunks.length}/${chunks.length} chunks (${recordCount} total records):`;

	// Add warning if some chunks failed
	if (failedChunks.length > 0) {
		finalContext += `\n\n⚠️ WARNING: ${failedChunks.length} chunk(s) failed to process due to errors. The analysis below is based on ${successfulChunks.length} successful chunks and may be incomplete.\n`;
	}

	finalContext += `\n\n${extractedData.join("\n\n=== NEXT CHUNK ===\n\n")}`;

	finalContext += `\n\nBased on all the extracted information above, provide a complete, organized answer to the user's question: "${question}"`;

	// If chunks failed, remind AI to acknowledge incomplete data
	if (failedChunks.length > 0) {
		finalContext += `\n\nNote: Some data chunks failed to process. Please acknowledge in your response that the results may be incomplete (e.g., "Based on available data..." or "From the processed records...").`;
	}

	// FIX #5: Monitor final context size and log warning
	const finalContextSize = finalContext.length;
	console.log(
		`[CHUNKED-PROCESSING] Final context size: ${finalContextSize} characters (~${Math.round(
			finalContextSize / 4
		)} tokens)`
	);

	if (finalContextSize > LARGE_CONTEXT_THRESHOLD) {
		console.warn(
			`[CHUNKED-PROCESSING] ⚠️ Large final context detected (${finalContextSize} chars). This may slow down synthesis or cause timeouts. Consider refining extraction prompts for more concise output.`
		);
	}

	// Report synthesis progress
	if (onProgress) {
		onProgress(
			`Synthesizing final response from ${successfulChunks.length} chunks...`
		);
	}

	// Final synthesis
	const synthesisStartTime = Date.now();
	const finalResponse = await generateAIResponse(
		question,
		finalContext,
		conversationHistory, // FIX #4: Include conversation history in final synthesis
		"analytical_query"
	);
	const synthesisTime = Date.now() - synthesisStartTime;

	// FIX #1: Add synthesis tokens to total
	totalInputTokens += finalResponse.inputTokens || 0;
	totalOutputTokens += finalResponse.outputTokens || 0;

	console.log(
		`[CHUNKED-PROCESSING] Final synthesis completed in ${synthesisTime}ms (tokens: ${finalResponse.inputTokens} in, ${finalResponse.outputTokens} out)`
	);
	console.log(
		`[CHUNKED-PROCESSING] ✅ Total processing time: ${
			chunkProcessingTime + synthesisTime
		}ms`
	);
	console.log(
		`[CHUNKED-PROCESSING] ✅ Total token usage: ${totalInputTokens} input + ${totalOutputTokens} output = ${
			totalInputTokens + totalOutputTokens
		} tokens`
	);

	// FIX #1: Return accurate total tokens
	return {
		text: finalResponse.text,
		inputTokens: totalInputTokens,
		outputTokens: totalOutputTokens,
	};
}

/**
 * Determine if a query is analytical and requires chunked processing
 */
export function isAnalyticalQuery(
	question: string,
	queryType: string
): boolean {
	// Check query type
	if (queryType === "analytical_query") return true;

	// Check for analytical keywords
	const analyticalPatterns = [
		/\ball\b.*\b(victim|suspect|witness|location|place|date|time|age|name)/i,
		/\blist\b.*\b(all|every|each)\b/i,
		/\bsummarize\b|\bsummary\b/i,
		/\bcount\b|\btotal\b|\bnumber of\b/i,
		/\baverage\b|\bmean\b|\bmedian\b/i,
		/\btrend\b|\bpattern\b/i,
		/\bcompare\b|\bcomparison\b/i,
		/\brelationship\b|\bcorrelation\b/i,
	];

	return analyticalPatterns.some((pattern) => pattern.test(question));
}
