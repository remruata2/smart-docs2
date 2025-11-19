import { PrismaClient } from "../generated/prisma";
import { SemanticVectorService } from "./semantic-vector";

const prisma = new PrismaClient();

export interface HybridSearchResult {
	id: number;
	category: string;
	title: string;
	note: string;
	entry_date_real: Date | null;
	rrf_score: number;
	semantic_rank?: number;
	keyword_rank?: number;
	// Legacy fields for backward compatibility
	ts_rank?: number;
	semantic_similarity?: number;
	combined_score?: number;
}

export class HybridSearchService {
	/**
	 * The RRF Hybrid Search Implementation (Parallel Ensemble)
	 *
	 * Instead of filtering sequentially (Keywords -> Vector), this runs both
	 * in parallel inside the DB and fuses the results.
	 *
	 * 1. Semantic Search (Vector) -> gets top 50 by meaning
	 * 2. Keyword Search (TSVector) -> gets top 50 by exact text match
	 * 3. RRF Fusion -> Combines lists. Docs in BOTH lists get a massive score boost.
	 */
	static async search(
		query: string,
		limit: number = 20,
		filters?: {
			category?: string;
			userId?: number;
		}
	): Promise<{
		results: HybridSearchResult[];
		searchMethod:
			| "hybrid"
			| "semantic_fallback"
			| "tsvector_only"
			| "vector_only"
			| "keyword_only";
		stats: {
			tsvectorResults: number;
			semanticResults: number;
			finalResults: number;
			totalCandidates?: number; // New field
		};
	}> {
		try {
			console.log(`[HYBRID RRF] Starting search for: "${query}"`);

			// 1. Handle Empty Query (Return recent/all)
			if (!query || !query.trim()) {
				const allRecordsResult = await this.getAllRecords(limit, filters);
				return {
					results: allRecordsResult.results,
					searchMethod: "tsvector_only",
					stats: {
						tsvectorResults: allRecordsResult.results.length,
						semanticResults: 0,
						finalResults: allRecordsResult.results.length,
						totalCandidates: allRecordsResult.results.length,
					},
				};
			}

			// 2. Generate Embedding (for the semantic part of the query)
			const embedding = await SemanticVectorService.generateEmbedding(query);

			// 3. Prepare inputs
			const categoryFilter = filters?.category?.toLowerCase().trim() || null;
			const userIdFilter = filters?.userId || null;

			// 4. The "Holy Grail" RRF Query
			// We fetch top 50 from each method to ensure good overlap
			const results = await prisma.$queryRawUnsafe<HybridSearchResult[]>(
				`
        WITH semantic_search AS (
            SELECT 
                id, title, category, note, entry_date_real,
                RANK() OVER (ORDER BY semantic_vector <=> $1::vector) as rank
            FROM file_list
            WHERE semantic_vector IS NOT NULL
              AND ($2::text IS NULL OR LOWER(TRIM(category)) = $2) -- Category Filter
              AND ($3::int IS NULL OR user_id = $3)                -- User Filter
            ORDER BY semantic_vector <=> $1::vector
            LIMIT 50
        ),
        keyword_search AS (
            SELECT 
                id, title, category, note, entry_date_real,
                RANK() OVER (ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', $4)) DESC) as rank
            FROM file_list
            WHERE search_vector @@ websearch_to_tsquery('english', $4)
              AND ($2::text IS NULL OR LOWER(TRIM(category)) = $2) -- Category Filter
              AND ($3::int IS NULL OR user_id = $3)                -- User Filter
            ORDER BY ts_rank_cd(search_vector, websearch_to_tsquery('english', $4)) DESC
            LIMIT 50
        )
        SELECT 
            COALESCE(s.id, k.id) as id,
            COALESCE(s.category, k.category) as category,
            COALESCE(s.title, k.title) as title,
            COALESCE(s.note, k.note) as note,
            COALESCE(s.entry_date_real, k.entry_date_real) as entry_date_real,
            
            -- RRF Score Calculation: 1 / (constant + rank)
            (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score,
            
            s.rank as semantic_rank,
            k.rank as keyword_rank
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.id = k.id
        ORDER BY rrf_score DESC
        LIMIT $5
      `,
				embedding, // $1 - Pass array directly, Prisma will handle vector casting
				categoryFilter, // $2
				userIdFilter, // $3
				query, // $4
				limit // $5
			);

			console.log(`[HYBRID RRF] Found ${results.length} results.`);

			// Calculate stats for backward compatibility
			const semanticCount = results.filter(
				(r) => r.semantic_rank !== null && r.semantic_rank !== undefined
			).length;
			const keywordCount = results.filter(
				(r) => r.keyword_rank !== null && r.keyword_rank !== undefined
			).length;
			const bothCount = results.filter(
				(r) =>
					r.semantic_rank !== null &&
					r.keyword_rank !== null &&
					r.semantic_rank !== undefined &&
					r.keyword_rank !== undefined
			).length;

			// Determine search method
			let searchMethod: "hybrid" | "vector_only" | "keyword_only" = "hybrid";
			if (semanticCount > 0 && keywordCount === 0) {
				searchMethod = "vector_only";
			} else if (keywordCount > 0 && semanticCount === 0) {
				searchMethod = "keyword_only";
			}

			// Map to legacy format for backward compatibility
			const mappedResults: HybridSearchResult[] = results.map((r) => ({
				...r,
				combined_score: r.rrf_score,
				ts_rank: r.keyword_rank ? 1.0 / (60 + r.keyword_rank) : undefined,
				semantic_similarity: r.semantic_rank
					? 1.0 / (60 + r.semantic_rank)
					: undefined,
			}));

			return {
				results: mappedResults,
				searchMethod:
					searchMethod === "vector_only"
						? "semantic_fallback"
						: searchMethod === "keyword_only"
						? "tsvector_only"
						: "hybrid",
				stats: {
					tsvectorResults: keywordCount,
					semanticResults: semanticCount,
					finalResults: results.length,
					totalCandidates: results.length,
				},
			};
		} catch (error) {
			console.error("[HYBRID RRF] Error:", error);
			// Fallback to simple keyword search if vectors fail
			return this.fallbackKeywordSearch(query, limit, filters);
		}
	}

	/**
	 * Fallback: Standard Keyword Search if Vector Generation Fails
	 */
	private static async fallbackKeywordSearch(
		query: string,
		limit: number,
		filters?: {
			category?: string;
			userId?: number;
		}
	): Promise<{
		results: HybridSearchResult[];
		searchMethod:
			| "hybrid"
			| "semantic_fallback"
			| "tsvector_only"
			| "vector_only"
			| "keyword_only";
		stats: {
			tsvectorResults: number;
			semanticResults: number;
			finalResults: number;
			totalCandidates?: number;
		};
	}> {
		console.log("[HYBRID RRF] Falling back to Keyword Only");
		const rawQuery = (query || "").trim();
		if (!rawQuery) {
			return this.getAllRecords(limit, filters);
		}

		const params: any[] = [];
		params.push(rawQuery); // $1 for websearch_to_tsquery

		let sql = `
      SELECT
        id,
        category,
        title,
        note,
        entry_date_real,
        ts_rank_cd(search_vector, websearch_to_tsquery('english', $1)) as ts_rank
      FROM file_list
      WHERE search_vector @@ websearch_to_tsquery('english', $1)`;

		let nextIndex = 2;

		// Add category filter
		if (filters?.category) {
			sql += ` AND LOWER(TRIM(category)) = $${nextIndex}`;
			params.push(filters.category.toLowerCase().trim());
			nextIndex++;
		}

		// Add userId filter
		if (filters?.userId) {
			sql += ` AND user_id = $${nextIndex}`;
			params.push(filters.userId);
			nextIndex++;
		}

		sql += `
      ORDER BY ts_rank DESC, entry_date_real DESC
      LIMIT $${nextIndex}
    `;
		params.push(limit);

		try {
			const results = (await prisma.$queryRawUnsafe(
				sql,
				...params
			)) as HybridSearchResult[];

			return {
				results: results.map((r) => ({
					...r,
					rrf_score: r.ts_rank || 0,
					keyword_rank: 1, // Approximate
					combined_score: r.ts_rank || 0,
				})),
				searchMethod: "tsvector_only",
				stats: {
					tsvectorResults: results.length,
					semanticResults: 0,
					finalResults: results.length,
					totalCandidates: results.length,
				},
			};
		} catch (error) {
			console.error("[HYBRID RRF] Fallback keyword search error:", error);
			return {
				results: [],
				searchMethod: "keyword_only",
				stats: {
					tsvectorResults: 0,
					semanticResults: 0,
					finalResults: 0,
					totalCandidates: 0,
				},
			};
		}
	}

	/**
	 * Get all records with optional filters (for "show all" queries)
	 */
	private static async getAllRecords(
		limit: number,
		filters?: {
			category?: string;
			userId?: number;
		}
	): Promise<{
		results: HybridSearchResult[];
		searchMethod:
			| "hybrid"
			| "semantic_fallback"
			| "tsvector_only"
			| "vector_only"
			| "keyword_only";
		stats: {
			tsvectorResults: number;
			semanticResults: number;
			finalResults: number;
			totalCandidates?: number;
		};
	}> {
		const params: any[] = [];
		let sql = `
      SELECT
        id,
        category,
        title,
        note,
        entry_date_real
      FROM file_list
      WHERE 1=1`;

		let nextIndex = 1;

		// Add category filter
		if (filters?.category) {
			sql += ` AND LOWER(TRIM(category)) = $${nextIndex}`;
			params.push(filters.category.toLowerCase().trim());
			nextIndex++;
			console.log(
				`[GET_ALL_RECORDS] Applying category filter: "${filters.category}"`
			);
		}

		// Add userId filter
		if (filters?.userId) {
			sql += ` AND user_id = $${nextIndex}`;
			params.push(filters.userId);
			nextIndex++;
		}

		sql += `
      ORDER BY entry_date_real DESC NULLS LAST, id DESC
      LIMIT $${nextIndex}
    `;
		params.push(limit);

		console.log(
			`[HYBRID RRF] Getting all records with limit: ${limit}, filters:`,
			filters
		);

		const results = (await prisma.$queryRawUnsafe(
			sql,
			...params
		)) as HybridSearchResult[];

		return {
			results: results.map((r) => ({
				...r,
				rrf_score: 0,
				combined_score: 0,
			})),
			searchMethod: "tsvector_only",
			stats: {
				tsvectorResults: results.length,
				semanticResults: 0,
				finalResults: results.length,
				totalCandidates: results.length,
			},
		};
	}
}
