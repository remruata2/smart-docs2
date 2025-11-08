import { PrismaClient } from "../generated/prisma";
import { SemanticVectorService } from "./semantic-vector";

const prisma = new PrismaClient();

export interface HybridSearchResult {
  id: number;
  category: string;
  title: string;
  note: string;
  entry_date_real: Date | null;
  district: string | null;
  ts_rank?: number;
  semantic_similarity?: number;
  combined_score?: number;
}

export class HybridSearchService {
  /**
   * The Hybrid Search Recipe Implementation
   *
   * Step 1: Fast Keyword Filter (tsvector) - Pre-filter candidates
   * Step 2: Semantic Re-Ranker (pgvector) - Rank by meaning
   * Step 3: Intelligent Fallback - Full semantic search if no tsvector results
   */
  static async search(
    query: string,
    limit: number = 20,
    filters?: {
      district?: string;
      category?: string;
    }
  ): Promise<{
    results: HybridSearchResult[];
    searchMethod: "hybrid" | "semantic_fallback" | "tsvector_only";
    stats: {
      tsvectorResults: number;
      semanticResults: number;
      finalResults: number;
    };
  }> {
    try {
      console.log(`[HYBRID SEARCH] Starting search for: "${query}"`);

      // Handle empty query - return all records (with filters)
      if (!query || !query.trim()) {
        console.log(`[HYBRID SEARCH] Empty query, returning all records with filters`);
        const allRecords = await this.getAllRecords(limit, filters);
        return {
          results: allRecords,
          searchMethod: "tsvector_only", // Treat as direct query
          stats: {
            tsvectorResults: allRecords.length,
            semanticResults: 0,
            finalResults: allRecords.length,
          },
        };
      }

      // Step 1: The Fast Keyword Filter (tsvector)
      const tsvectorResults = await this.tsvectorSearch(query, undefined, filters);

      console.log(
        `[HYBRID SEARCH] Step 1 - tsvector found ${tsvectorResults.length} candidates`
      );

      if (tsvectorResults.length === 0) {
        console.log(
          "[HYBRID SEARCH] Step 3 - Using intelligent fallback (full semantic search)"
        );

        // Step 3: The Intelligent Fallback
        const semanticResults = await SemanticVectorService.semanticSearch(
          query,
          limit,
          filters
        );

        return {
          results: semanticResults.map((result) => ({
            ...result,
            semantic_similarity: result.similarity,
            combined_score: result.similarity,
          })),
          searchMethod: "semantic_fallback",
          stats: {
            tsvectorResults: 0,
            semanticResults: semanticResults.length,
            finalResults: semanticResults.length,
          },
        };
      }

      // Step 2: The Semantic Re-Ranker (pgvector)
      const candidateIds = tsvectorResults.map((r) => r.id);
      const semanticResults = await this.semanticSearchOnCandidates(
        query,
        candidateIds,
        limit
      );

      console.log(
        `[HYBRID SEARCH] Step 2 - semantic re-ranking on ${candidateIds.length} candidates`
      );

      // Combine and rank results using hybrid scoring
      const combinedResults = this.combineAndRankResults(
        tsvectorResults,
        semanticResults,
        limit
      );

      console.log(`[HYBRID SEARCH] Final results: ${combinedResults.length}`);

      return {
        results: combinedResults,
        searchMethod: "hybrid",
        stats: {
          tsvectorResults: tsvectorResults.length,
          semanticResults: semanticResults.length,
          finalResults: combinedResults.length,
        },
      };
    } catch (error) {
      console.error("[HYBRID SEARCH] Error:", error);

      // Fallback to tsvector only
      console.log("[HYBRID SEARCH] Error fallback - using tsvector only");
      const fallbackResults = await this.tsvectorSearch(query, undefined, filters);
      return {
        results: fallbackResults,
        searchMethod: "tsvector_only",
        stats: {
          tsvectorResults: fallbackResults.length,
          semanticResults: 0,
          finalResults: fallbackResults.length,
        },
      };
    }
  }

  private static async tsvectorSearch(
    query: string,
    limit?: number,
    filters?: {
      district?: string;
      category?: string;
    }
  ): Promise<HybridSearchResult[]> {
    // Use web-style tsquery; add structured filters and cap candidates
    const rawQuery = (query || "").trim();
    if (!rawQuery) return [];



    // Optional: if user provides a quoted phrase, use it to narrow title
    const quoteMatch = rawQuery.match(/"([^"]+)"/);
    const titlePhrase = quoteMatch ? quoteMatch[1] : undefined;

    // Build SQL with dynamic filters and LIMIT
    const params: any[] = [];
    const tsParamIndex = 1;
    params.push(rawQuery); // $1 for websearch_to_tsquery

    let sql = `
      SELECT
        id,
        category,
        title,
        note,
        entry_date_real,
        district,
        ts_rank(search_vector, websearch_to_tsquery('english', $${tsParamIndex})) as ts_rank
      FROM file_list
      WHERE search_vector @@ websearch_to_tsquery('english', $${tsParamIndex})`;

    let nextIndex = tsParamIndex + 1;
    if (titlePhrase) {
      sql += ` AND title ILIKE '%' || $${nextIndex} || '%'
      `;
      params.push(titlePhrase);
      nextIndex++;
    }

    // Add district filter
    if (filters?.district) {
      sql += ` AND district = $${nextIndex}`;
      params.push(filters.district);
      nextIndex++;
    }

    // Add category filter
    if (filters?.category) {
  sql += ` AND LOWER(TRIM(category)) = LOWER(TRIM($${nextIndex}))`;
  params.push(filters.category);
  nextIndex++;
  console.log(`[TSVECTOR] Applying category filter: "${filters.category}"`);
}

    const cap = 1000;
    sql += `
      ORDER BY ts_rank DESC, entry_date_real DESC
      LIMIT $${nextIndex}
    `;
    params.push(cap);

    console.log(
      `[TSVECTOR] Query: "${rawQuery}" | filters: { titlePhrase: ${titlePhrase ?? "-"} } | cap: ${cap}`
    );

    const results = (await prisma.$queryRawUnsafe(sql, ...params)) as HybridSearchResult[];

    console.log(
      `[TSVECTOR] Found ${results.length} records (capped at ${cap})`
    );
    return results;
  }

  /**
   * Get all records with optional filters (for "show all" queries)
   */
  private static async getAllRecords(
    limit: number,
    filters?: {
      district?: string;
      category?: string;
    }
  ): Promise<HybridSearchResult[]> {
    const params: any[] = [];
    let sql = `
      SELECT
        id,
        category,
        title,
        note,
        entry_date_real,
        district
      FROM file_list
      WHERE 1=1`;

    let nextIndex = 1;

    // Add district filter
    if (filters?.district) {
      sql += ` AND district = $${nextIndex}`;
      params.push(filters.district);
      nextIndex++;
    }

    // Add category filter
    if (filters?.category) {
      sql += ` AND LOWER(TRIM(category)) = LOWER(TRIM($${nextIndex}))`;
      params.push(filters.category);
      nextIndex++;
      console.log(`[GET_ALL_RECORDS] Applying category filter: "${filters.category}"`);
    }

    sql += `
      ORDER BY entry_date_real DESC NULLS LAST, id DESC
      LIMIT $${nextIndex}
    `;
    params.push(limit);

    console.log(`[HYBRID SEARCH] Getting all records with limit: ${limit}, filters:`, filters);

    const results = (await prisma.$queryRawUnsafe(sql, ...params)) as HybridSearchResult[];
    return results;
  }

  /**
   * Perform semantic search on a specific set of candidate records
   */
  private static async semanticSearchOnCandidates(
    query: string,
    candidateIds: number[],
    limit: number
  ): Promise<HybridSearchResult[]> {
    if (candidateIds.length === 0) return [];

    try {
      const queryEmbedding = await SemanticVectorService.generateEmbedding(query);
      const SIMILARITY_THRESHOLD = 0.3;

      // Create placeholders for the IN clause
      const placeholders = candidateIds.map((_, i) => `$${i + 2}`).join(', ');
      const params = [queryEmbedding, SIMILARITY_THRESHOLD, ...candidateIds];

      const results = (await prisma.$queryRawUnsafe(`
        SELECT
          id,
          category,
          title,
          note,
          entry_date_real,
          district,
          1 - (semantic_vector <=> $1::vector) as semantic_similarity
        FROM file_list
        WHERE semantic_vector IS NOT NULL
          AND (1 - (semantic_vector <=> $1::vector)) > $2
          AND id IN (${placeholders})
        ORDER BY semantic_vector <=> $1::vector
        LIMIT $${candidateIds.length + 3}
      `, ...params, limit)) as HybridSearchResult[];

      console.log(
        `[SEMANTIC CANDIDATES] Found ${results.length} semantic matches from ${candidateIds.length} candidates`
      );

      return results;
    } catch (error) {
      console.error('[SEMANTIC CANDIDATES] Error:', error);
      return [];
    }
  }

  private static combineAndRankResults(
    tsvectorResults: HybridSearchResult[],
    semanticResults: HybridSearchResult[],
    limit: number
  ): HybridSearchResult[] {
    // Create a map of results by ID
    const resultMap = new Map<number, HybridSearchResult>();

    // Add tsvector results with initial scoring (60% weight)
    tsvectorResults.forEach((result) => {
      resultMap.set(result.id, {
        ...result,
        combined_score: (result.ts_rank || 0) * 0.6,
      });
    });

    // Add semantic results and update scores (40% weight)
    semanticResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Hybrid score: 60% tsvector + 40% semantic
        existing.semantic_similarity = result.semantic_similarity;
        existing.combined_score =
          (existing.ts_rank || 0) * 0.6 +
          (result.semantic_similarity || 0) * 0.4;
      } else {
        // Semantic-only result (shouldn't happen in normal flow, but safety net)
        resultMap.set(result.id, {
          ...result,
          combined_score: (result.semantic_similarity || 0) * 0.4,
        });
      }
    });

    // Sort by combined score and return top results
    const finalResults = Array.from(resultMap.values())
      .sort((a, b) => (b.combined_score || 0) - (a.combined_score || 0))
      .slice(0, limit);

    console.log(
      `[HYBRID] Combined scoring completed: ${finalResults.length} results`
    );

    // Detailed logging for debugging
    console.log(
      "[HYBRID-DEBUG] Initial tsvector results:",
      tsvectorResults.map((r) => ({ id: r.id, ts_rank: r.ts_rank }))
    );
    console.log(
      "[HYBRID-DEBUG] Semantic re-ranking results:",
      semanticResults.map((r) => ({
        id: r.id,
        semantic_similarity: r.semantic_similarity,
      }))
    );
    console.log(
      "[HYBRID-DEBUG] Final combined and sorted results:",
      finalResults.map((r) => ({ id: r.id, combined_score: r.combined_score }))
    );

    return finalResults;
  }
}
