import { SearchResult } from "./ai-service-enhanced";
import { generateAIResponse } from "./ai-service-enhanced";

// Server-safe implementation - no browser globals

// Constants for chunked processing
const CHUNK_SIZE = 15; // Reduced from 20 for better performance
const MAX_CONCURRENT_REQUESTS = 3; // Reduced from 5 to avoid rate limits

/**
 * Process chunks with concurrency limiting
 */
async function processChunksWithConcurrency(
  chunks: SearchResult[][],
  extractionPrompt: string
): Promise<string[]> {
  const results: string[] = [];

  // Process chunks in batches to limit concurrency
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = chunks.slice(i, i + MAX_CONCURRENT_REQUESTS);
    const batchPromises = batch.map((chunk, batchIndex) =>
      processChunk(chunk, i + batchIndex, chunks.length, extractionPrompt)
    );

    console.log(
      `[CHUNKED-PROCESSING] Processing batch ${
        Math.floor(i / MAX_CONCURRENT_REQUESTS) + 1
      }/${Math.ceil(chunks.length / MAX_CONCURRENT_REQUESTS)} with ${
        batch.length
      } chunks`
    );

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
    context += `[${index + 1}] File: ${record.file_no} | Title: ${
      record.title
    } | Category: ${record.category || "Uncategorized"} | Date: ${
      record.entry_date_real?.toLocaleDateString() || "Unknown date"
    }\n`;
  });

  // Add full record details
  context += "\nDETAILED RECORDS:\n";
  records.forEach((record, index) => {
    let content = record.note || "No content available";

    context += `\n[RECORD ${index + 1}]`;
    context += `\nFile: ${record.file_no}`;
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
 * Process a single chunk of records
 */
async function processChunk(
  chunk: SearchResult[],
  index: number,
  totalChunks: number,
  extractionPrompt: string
): Promise<string> {
  console.log(
    `[CHUNKED-PROCESSING] Starting chunk ${index + 1}/${totalChunks} with ${
      chunk.length
    } records`
  );
  const startTime = Date.now();

  try {
    const chunkContext = prepareContextForChunk(chunk);

    const chunkResponse = await generateAIResponse(
      extractionPrompt,
      chunkContext,
      [], // No conversation history needed for extraction
      "analytical_query" // Force analytical query type
    );

    const elapsed = Date.now() - startTime;
    console.log(
      `[CHUNKED-PROCESSING] Completed chunk ${
        index + 1
      }/${totalChunks} in ${elapsed}ms`
    );

    return chunkResponse.text;
  } catch (error) {
    console.error(
      `[CHUNKED-PROCESSING] Error processing chunk ${
        index + 1
      }/${totalChunks}:`,
      error
    );
    return `Error processing chunk ${index + 1}: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

/**
 * Process records in parallel chunks for analytical queries
 */
export async function processChunkedAnalyticalQuery(
  question: string,
  records: SearchResult[]
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

  // Create extraction prompt based on the question
  let extractionPrompt = `Extract all relevant information from these records related to: "${question}"`;

  // Customize extraction prompt for specific query types
  if (
    question.toLowerCase().includes("victim") &&
    question.toLowerCase().includes("suspect")
  ) {
    extractionPrompt =
      "Extract all victim and suspect names with their ages from these records only. Format as a structured list.";
  } else if (
    question.toLowerCase().includes("location") ||
    question.toLowerCase().includes("place")
  ) {
    extractionPrompt =
      "Extract all locations/places mentioned in these records with associated incidents. Format as a structured list.";
  }

  // Process chunks with concurrency limiting
  const chunkStartTime = Date.now();
  const extractedData = await processChunksWithConcurrency(
    chunks,
    extractionPrompt
  );
  const chunkProcessingTime = Date.now() - chunkStartTime;

  console.log(
    `[CHUNKED-PROCESSING] All ${chunks.length} chunks processed in ${chunkProcessingTime}ms, synthesizing final response`
  );

  // Final synthesis with a small context
  const finalContext = `
Here is data extracted from ${
    chunks.length
  } sets of records (${recordCount} total records):

${extractedData.join("\n\n=== NEXT CHUNK ===\n\n")}

Based on all the extracted information above, provide a complete, organized answer to the user's question: "${question}"
`;

  const synthesisStartTime = Date.now();
  const finalResponse = await generateAIResponse(
    question,
    finalContext,
    [], // No conversation history for final synthesis
    "analytical_query"
  );
  const synthesisTime = Date.now() - synthesisStartTime;

  console.log(
    `[CHUNKED-PROCESSING] Final synthesis completed in ${synthesisTime}ms`
  );
  console.log(
    `[CHUNKED-PROCESSING] Total processing time: ${
      chunkProcessingTime + synthesisTime
    }ms`
  );

  return finalResponse;
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
