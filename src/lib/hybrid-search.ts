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
	citation?: {
		pageNumber: number;
		imageUrl: string;
		boundingBox: any;
	};
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
			// UPDATED: Query file_chunks instead of file_list
			const results = await prisma.$queryRawUnsafe<HybridSearchResult[]>(
				`
        WITH semantic_search AS (
            SELECT 
                fc.id as chunk_id, 
                f.id as file_id, 
                f.title, 
                f.category, 
                f.note, 
                f.entry_date_real,
                fc.content as chunk_content,
                fc.page_number,
                fc.bbox,
                RANK() OVER (ORDER BY fc.semantic_vector <=> $1::vector) as rank
            FROM file_chunks fc
            JOIN file_list f ON fc.file_id = f.id
            WHERE fc.semantic_vector IS NOT NULL
              AND (f.parsing_status = 'completed' OR f.parsing_status IS NULL) -- Only search completed files
              AND ($2::text IS NULL OR LOWER(TRIM(f.category)) = $2) -- Category Filter
              AND ($3::int IS NULL OR f.user_id = $3)                -- User Filter
            ORDER BY fc.semantic_vector <=> $1::vector
            LIMIT 50
        ),
        keyword_search_base AS (
            -- Search file chunks (content)
            SELECT 
                fc.id as chunk_id, 
                f.id as file_id, 
                f.title, 
                f.category, 
                f.note, 
                f.entry_date_real,
                fc.content as chunk_content,
                fc.page_number,
                fc.bbox,
                ts_rank_cd(fc.search_vector, websearch_to_tsquery('english', $4)) as search_rank
            FROM file_chunks fc
            JOIN file_list f ON fc.file_id = f.id
            WHERE fc.search_vector @@ websearch_to_tsquery('english', $4)
              AND (f.parsing_status = 'completed' OR f.parsing_status IS NULL) -- Only search completed files
              AND ($2::text IS NULL OR LOWER(TRIM(f.category)) = $2) -- Category Filter
              AND ($3::int IS NULL OR f.user_id = $3)                -- User Filter
            
            UNION ALL
            
            -- Search file metadata (title, category, note) - important for finding files by title
            SELECT 
                NULL as chunk_id,  -- No specific chunk, this is file-level match
                f.id as file_id, 
                f.title, 
                f.category, 
                f.note, 
                f.entry_date_real,
                f.note as chunk_content,  -- Use note as content for file-level matches
                NULL as page_number,  -- No specific page for file-level matches
                NULL as bbox,  -- No specific bbox for file-level matches
                ts_rank_cd(f.search_vector, websearch_to_tsquery('english', $4)) as search_rank
            FROM file_list f
            WHERE f.search_vector @@ websearch_to_tsquery('english', $4)
              AND (f.parsing_status = 'completed' OR f.parsing_status IS NULL) -- Only search completed files
              AND ($2::text IS NULL OR LOWER(TRIM(f.category)) = $2) -- Category Filter
              AND ($3::int IS NULL OR f.user_id = $3)                -- User Filter
              -- Only include files that don't already have chunk matches (to avoid duplicates)
              AND NOT EXISTS (
                  SELECT 1 FROM file_chunks fc2 
                  WHERE fc2.file_id = f.id 
                  AND fc2.search_vector @@ websearch_to_tsquery('english', $4)
              )
        ),
        keyword_search AS (
            SELECT 
                chunk_id,
                file_id,
                title,
                category,
                note,
                entry_date_real,
                chunk_content,
                page_number,
                bbox,
                RANK() OVER (ORDER BY search_rank DESC) as rank
            FROM keyword_search_base
            ORDER BY search_rank DESC
            LIMIT 50
        )
        SELECT 
            COALESCE(s.file_id, k.file_id) as id,
            COALESCE(s.category, k.category) as category,
            COALESCE(s.title, k.title) as title,
            -- Use chunk content as the "note" for display/context
            COALESCE(s.chunk_content, k.chunk_content) as note,
            COALESCE(s.entry_date_real, k.entry_date_real) as entry_date_real,
            
            -- RRF Score Calculation: 1 / (constant + rank)
            (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score,
            
            s.rank as semantic_rank,
            k.rank as keyword_rank,
            
            -- Citation Data
            COALESCE(s.page_number, k.page_number) as page_number,
            COALESCE(s.bbox, k.bbox) as bbox
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.chunk_id = k.chunk_id
        ORDER BY rrf_score DESC
        LIMIT $5
			`,
				`[${embedding.join(",")}]`, // $1 - Explicit string formatting for pgvector
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
			const mappedResults: HybridSearchResult[] = results.map((r: any) => {
				// Handle new bbox format: can be array of objects [{text, bbox}, ...] or simple array [x,y,w,h]
				// Robust JSON parsing for raw SQL results
				// $queryRawUnsafe might return JSON columns as strings depending on driver version
				let parsedBbox = r.bbox;
				if (typeof r.bbox === "string") {
					try {
						parsedBbox = JSON.parse(r.bbox);
					} catch (e) {
						console.error("[HYBRID RRF] Failed to parse bbox JSON:", e);
						parsedBbox = null;
					}
				}

				let boundingBox: number[] | undefined = undefined;
				let layoutItems: Array<{ text: string; bbox: number[] }> | undefined =
					undefined;

				if (parsedBbox) {
					if (Array.isArray(parsedBbox) && parsedBbox.length > 0) {
						// Case 1: New format (Array of objects with text/bbox)
						if (typeof parsedBbox[0] === "object" && parsedBbox[0].bbox) {
							layoutItems = parsedBbox; // Store full array for fuzzy matching
							boundingBox = parsedBbox[0].bbox; // Default to first bbox
						}
						// Case 2: Old format (Simple [x,y,w,h])
						else if (typeof parsedBbox[0] === "number") {
							boundingBox = parsedBbox;
						}
					}
				}

				return {
					...r,
					combined_score: r.rrf_score,
					ts_rank: r.keyword_rank
						? 1.0 / (60 + Number(r.keyword_rank))
						: undefined,
					semantic_similarity: r.semantic_rank
						? 1.0 / (60 + Number(r.semantic_rank))
						: undefined,
					// Add citation data to the result object (will be used by frontend)
					// Create citation if page_number exists, use full-page fallback if bbox is missing
					citation: r.page_number
						? {
								pageNumber: r.page_number,
								imageUrl: `/files/${r.id}/page-${r.page_number}.jpg`,
								boundingBox: boundingBox || [0, 0, 1, 1], // Use full page if bbox missing
								layoutItems: layoutItems, // Full array for fuzzy matching
								chunkContent: r.note || "", // Chunk content for matching
								title: r.title || "Untitled Document", // File title
						  }
						: undefined,
				};
			});

			console.log(
				`[HYBRID RRF] Sample result with citation:`,
				mappedResults[0]?.citation
			);

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
      WITH file_chunks_agg AS (
        SELECT 
          fc.file_id,
          STRING_AGG(fc.content, E'\\n\\n' ORDER BY fc.page_number, fc.chunk_index) as aggregated_content
        FROM file_chunks fc
        JOIN file_list f ON fc.file_id = f.id
        WHERE 1=1`;

		let nextIndex = 1;

		// Add category filter to chunks query
		if (filters?.category) {
			sql += ` AND LOWER(TRIM(f.category)) = $${nextIndex}`;
			params.push(filters.category.toLowerCase().trim());
			nextIndex++;
		}

		// Add userId filter to chunks query
		if (filters?.userId) {
			sql += ` AND f.user_id = $${nextIndex}`;
			params.push(filters.userId);
			nextIndex++;
		}

		sql += `
        GROUP BY fc.file_id
      )
      SELECT
        f.id,
        f.category,
        f.title,
        COALESCE(fca.aggregated_content, f.note, '') as note,
        f.entry_date_real
      FROM file_list f
      LEFT JOIN file_chunks_agg fca ON f.id = fca.file_id
      WHERE 1=1`;

		// Add category filter to main query
		if (filters?.category) {
			sql += ` AND LOWER(TRIM(f.category)) = $${nextIndex}`;
			params.push(filters.category.toLowerCase().trim());
			nextIndex++;
			console.log(
				`[GET_ALL_RECORDS] Applying category filter: "${filters.category}"`
			);
		}

		// Add userId filter to main query
		if (filters?.userId) {
			sql += ` AND f.user_id = $${nextIndex}`;
			params.push(filters.userId);
			nextIndex++;
		}

		// Only include files that have been parsed
		sql += ` AND (f.parsing_status = 'completed' OR f.parsing_status IS NULL)`;

		sql += `
      ORDER BY f.entry_date_real DESC NULLS LAST, f.id DESC
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
