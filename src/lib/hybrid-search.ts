import { PrismaClient } from "../generated/prisma";
import { SemanticVectorService } from "./semantic-vector";

const prisma = new PrismaClient();

export interface HybridSearchResult {
	id: string; // Chapter ID (BigInt as string)
	subject: string;
	title: string;
	content: string;
	created_at: Date | null;
	rrf_score: number;
	semantic_rank?: number;
	keyword_rank?: number;
	citation?: {
		pageNumber: number;
		imageUrl: string;
		boundingBox: any;
		layoutItems?: any[];
		chunkContent: string;
		title: string;
	};
}

export class HybridSearchService {
	/**
	 * The RRF Hybrid Search Implementation (Parallel Ensemble)
	 * Enforces board_id filtering for multi-tenancy.
	 */
	static async search(
		query: string,
		limit: number = 20,
		filters: {
			boardId: string;
			subjectId?: number;
			chapterId?: number;
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
		};
	}> {
		try {
			console.log(`[HYBRID RRF] Starting search for: "${query}"`, filters);

			if (!filters.boardId) {
				throw new Error("boardId is required for search");
			}

			// 1. Handle Empty Query
			// If query is empty but filters are provided, return all matching chunks
			// (needed for analytical queries that need complete data)
			const isEmptyQuery = !query || !query.trim();
			const hasFilters = filters.subjectId || filters.chapterId;

			if (isEmptyQuery && !hasFilters) {
				return {
					results: [],
					searchMethod: "tsvector_only",
					stats: { tsvectorResults: 0, semanticResults: 0, finalResults: 0 },
				};
			}

			// 2. Generate Embedding (use a dummy query if empty, but we'll filter by filters only)
			const embedding = isEmptyQuery
				? await SemanticVectorService.generateEmbedding("dummy") // Dummy embedding for empty queries
				: await SemanticVectorService.generateEmbedding(query);

			// 3. Prepare inputs
			const boardId = filters.boardId;
			const subjectId = filters.subjectId || null;
			const chapterId = filters.chapterId || null;
			const chapterIdBigInt = chapterId ? BigInt(chapterId) : null;

			// 4. RRF Query
			// For empty queries with filters, use a simpler query that just filters by board/subject/chapter
			let results: any[];

			if (isEmptyQuery && hasFilters) {
				// Empty query with filters - return all chunks matching filters
				console.log(
					`[HYBRID RRF] Empty query with filters - returning all matching chunks`
				);
				console.log(
					`[HYBRID RRF] Filters: boardId=${boardId}, subjectId=${subjectId}, chapterId=${chapterId} (type: ${typeof chapterId})`
				);

				// When chapterId is provided, skip board filtering
				// The chapter's accessible_boards already controls access at the chapter level
				if (chapterIdBigInt) {
					console.log(
						`[HYBRID RRF] chapterId provided - skipping board filter, returning all chunks for chapter`
					);
					results = await prisma.$queryRawUnsafe<any[]>(
						`
						SELECT 
							cc.id as chunk_id,
							c.id as chapter_id,
							c.id as id,
							c.title,
							s.name as subject_name,
							s.name as subject,
							cc.content as chunk_content,
							cc.content as content,
							cc.page_number,
							cc.bbox,
							c.created_at,
							cp.image_url,
							1.0 as rrf_score,
							1 as semantic_rank,
							1 as keyword_rank
						FROM chapter_chunks cc
						JOIN chapters c ON cc.chapter_id = c.id
						JOIN subjects s ON c.subject_id = s.id
						LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
						WHERE c.id = $1
						  AND ($2::int IS NULL OR c.subject_id = $2)
						  AND c.is_active = true
						  AND c.processing_status = 'COMPLETED'
						ORDER BY cc.chunk_index ASC
						LIMIT $3
						`,
						chapterIdBigInt, // $1
						subjectId, // $2
						limit // $3
					);
				} else {
					// No chapterId - apply board filtering
					results = await prisma.$queryRawUnsafe<any[]>(
						`
						SELECT 
							cc.id as chunk_id,
							c.id as chapter_id,
							c.id as id,
							c.title,
							s.name as subject_name,
							s.name as subject,
							cc.content as chunk_content,
							cc.content as content,
							cc.page_number,
							cc.bbox,
							c.created_at,
							cp.image_url,
							1.0 as rrf_score,
							1 as semantic_rank,
							1 as keyword_rank
						FROM chapter_chunks cc
						JOIN chapters c ON cc.chapter_id = c.id
						JOIN subjects s ON c.subject_id = s.id
						LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id AND ccb.board_id = $1
						LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
						WHERE (c.is_global = true OR ccb.chunk_id IS NOT NULL)
						  AND ($2::int IS NULL OR c.subject_id = $2)
						  AND c.is_active = true
						  AND c.processing_status = 'COMPLETED'
						ORDER BY cc.chunk_index ASC
						LIMIT $3
						`,
						boardId, // $1
						subjectId, // $2
						limit // $3
					);
				}

				console.log(`[HYBRID RRF] Query returned ${results.length} results`);
			} else {
				// Normal query with search terms
				// When chapterId is provided, skip board filtering
				const chapterIdBigInt = chapterId ? BigInt(chapterId) : null;

				if (chapterIdBigInt) {
					// chapterId provided - skip board filtering
					console.log(
						`[HYBRID RRF] chapterId provided - skipping board filter in search query`
					);
					results = await prisma.$queryRawUnsafe<any[]>(
						`
        WITH semantic_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                RANK() OVER (ORDER BY cc.semantic_vector <=> $1::vector) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.semantic_vector IS NOT NULL
              AND c.id = $2
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY cc.semantic_vector <=> $1::vector
            LIMIT 50
        ),
        keyword_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) as search_rank,
                RANK() OVER (ORDER BY ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) DESC) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.search_vector @@ websearch_to_tsquery('english', $4)
              AND c.id = $2
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY search_rank DESC
            LIMIT 50
        )
        SELECT 
            COALESCE(s.chapter_id, k.chapter_id) as id,
            COALESCE(s.subject_name, k.subject_name) as subject,
            COALESCE(s.title, k.title) as title,
            COALESCE(s.chunk_content, k.chunk_content) as content,
            COALESCE(s.created_at, k.created_at) as created_at,
            
            (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score,
            
            s.rank as semantic_rank,
            k.rank as keyword_rank,
            
            COALESCE(s.page_number, k.page_number) as page_number,
            COALESCE(s.bbox, k.bbox) as bbox,
            COALESCE(s.image_url, k.image_url) as image_url
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.chunk_id = k.chunk_id
        ORDER BY rrf_score DESC
        LIMIT $5
			`,
						`[${embedding.join(",")}]`, // $1
						chapterIdBigInt, // $2
						subjectId, // $3
						query, // $4
						limit // $5
					);
				} else {
					// No chapterId - apply board filtering
					results = await prisma.$queryRawUnsafe<any[]>(
						`
        WITH semantic_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                RANK() OVER (ORDER BY cc.semantic_vector <=> $1::vector) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id AND ccb.board_id = $2
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.semantic_vector IS NOT NULL
              AND (c.is_global = true OR ccb.chunk_id IS NOT NULL)
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY cc.semantic_vector <=> $1::vector
            LIMIT 50
        ),
        keyword_search AS (
            SELECT 
                cc.id as chunk_id, 
                c.id as chapter_id, 
                c.title, 
                s.name as subject_name,
                cc.content as chunk_content,
                cc.page_number,
                cc.bbox,
                c.created_at,
                cp.image_url,
                ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) as search_rank,
                RANK() OVER (ORDER BY ts_rank_cd(cc.search_vector, websearch_to_tsquery('english', $4)) DESC) as rank
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            JOIN subjects s ON c.subject_id = s.id
            LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id AND ccb.board_id = $2
            LEFT JOIN chapter_pages cp ON c.id = cp.chapter_id AND cc.page_number = cp.page_number
            WHERE cc.search_vector @@ websearch_to_tsquery('english', $4)
              AND (c.is_global = true OR ccb.chunk_id IS NOT NULL)
              AND ($3::int IS NULL OR c.subject_id = $3)
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            ORDER BY search_rank DESC
            LIMIT 50
        )
        SELECT 
            COALESCE(s.chapter_id, k.chapter_id) as id,
            COALESCE(s.subject_name, k.subject_name) as subject,
            COALESCE(s.title, k.title) as title,
            COALESCE(s.chunk_content, k.chunk_content) as content,
            COALESCE(s.created_at, k.created_at) as created_at,
            
            (COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score,
            
            s.rank as semantic_rank,
            k.rank as keyword_rank,
            
            COALESCE(s.page_number, k.page_number) as page_number,
            COALESCE(s.bbox, k.bbox) as bbox,
            COALESCE(s.image_url, k.image_url) as image_url
        FROM semantic_search s
        FULL OUTER JOIN keyword_search k ON s.chunk_id = k.chunk_id
        ORDER BY rrf_score DESC
        LIMIT $5
			`,
						`[${embedding.join(",")}]`, // $1
						boardId, // $2
						subjectId, // $3
						query, // $4
						limit // $5
					);
				}
			}

			console.log(`[HYBRID RRF] Found ${results.length} results.`);

			const semanticCount = results.filter((r) => r.semantic_rank).length;
			const keywordCount = results.filter((r) => r.keyword_rank).length;

			let searchMethod: "hybrid" | "vector_only" | "keyword_only" = "hybrid";
			if (semanticCount > 0 && keywordCount === 0) searchMethod = "vector_only";
			else if (keywordCount > 0 && semanticCount === 0)
				searchMethod = "keyword_only";

			const mappedResults: HybridSearchResult[] = results.map((r: any) => {
				let parsedBbox = r.bbox;
				if (typeof r.bbox === "string") {
					try {
						parsedBbox = JSON.parse(r.bbox);
					} catch (e) {
						parsedBbox = null;
					}
				}

				let boundingBox: number[] | undefined = undefined;
				if (parsedBbox && Array.isArray(parsedBbox) && parsedBbox.length > 0) {
					if (typeof parsedBbox[0] === "object" && parsedBbox[0].bbox) {
						boundingBox = parsedBbox[0].bbox;
					} else if (typeof parsedBbox[0] === "number") {
						boundingBox = parsedBbox;
					}
				}

				return {
					id: r.id.toString(),
					subject: r.subject,
					title: r.title,
					content: r.content,
					created_at: r.created_at,
					rrf_score: r.rrf_score,
					semantic_rank: r.semantic_rank,
					keyword_rank: r.keyword_rank,
					citation: r.page_number
						? {
								pageNumber: r.page_number,
								imageUrl: r.image_url || "", // Use Supabase URL directly from chapter_pages
								boundingBox: boundingBox || [0, 0, 1, 1],
								chunkContent: r.content || "",
								title: r.title,
						  }
						: undefined,
				};
			});

			return {
				results: mappedResults,
				searchMethod,
				stats: {
					tsvectorResults: keywordCount,
					semanticResults: semanticCount,
					finalResults: results.length,
				},
			};
		} catch (error) {
			console.error("[HYBRID RRF] Error:", error);
			return {
				results: [],
				searchMethod: "keyword_only",
				stats: { tsvectorResults: 0, semanticResults: 0, finalResults: 0 },
			};
		}
	}
}
