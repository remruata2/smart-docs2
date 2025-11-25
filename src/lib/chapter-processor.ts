/**
 * Background Chapter Processor
 * Handles async processing of chapters with LlamaParse and embedding generation
 */

import { prisma } from "@/lib/prisma";
import { LlamaParseDocumentParser } from "./llamaparse-document-parser";
import { SemanticVectorService } from "./semantic-vector";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { generatePageImages, uploadPageImages } from "./pdf-image-generator";
import { generateStudyMaterials, StudyMaterialsConfig } from "./ai-service-enhanced";
import { searchYouTubeVideos } from "./youtube-service";

export interface ChapterProcessingJob {
	chapterId: string;
	pdfBuffer: Buffer;
	fileName: string;
	startPage?: number;
	endPage?: number;
}

/**
 * Generate study materials for a chapter in the background (non-blocking)
 */
async function generateStudyMaterialsBackground(
	chapterId: string,
	chapterInfo: { title: string; subject: { name: string } }
) {
	try {
		const bigChapterId = BigInt(chapterId);

		// Check if already exists
		const existing = await prisma.studyMaterial.findUnique({
			where: { chapter_id: bigChapterId },
		});

		if (existing) {
			console.log(`[BG-PROCESSOR] Study materials already exist for chapter ${chapterId}, skipping`);
			return;
		}

		// Get full chapter content
		const chapter = await prisma.chapter.findUnique({
			where: { id: bigChapterId },
		});

		if (!chapter) return;

		// Extract content
		const content: any = chapter.content_json;
		const chapterContent = content.text || content.markdown || JSON.stringify(content);

		// Generate with AI
		const config: StudyMaterialsConfig = {
			subject: chapterInfo.subject.name,
			chapterTitle: chapterInfo.title,
			content: chapterContent,
		};

		const aiMaterials = await generateStudyMaterials(config);

		// Search YouTube
		const videoSearches = await Promise.all(
			aiMaterials.youtube_search_queries.map(query =>
				searchYouTubeVideos({ query, maxResults: 2 })
			)
		);
		const curatedVideos = videoSearches.flat().slice(0, 6);

		// Save to database
		await prisma.studyMaterial.create({
			data: {
				chapter_id: bigChapterId,
				summary: {
					brief: aiMaterials.summary_markdown,
					key_points: aiMaterials.key_terms.map(t => t.term),
					important_formulas: aiMaterials.important_formulas || [],
				},
				definitions: aiMaterials.key_terms,
				flashcards: aiMaterials.flashcards,
				mind_map: aiMaterials.mind_map_mermaid,
				video_queries: aiMaterials.youtube_search_queries,
				curated_videos: curatedVideos as any, // Cast as any for JSON field
			},
		});

		console.log(`[BG-PROCESSOR] Successfully generated study materials for chapter ${chapterId}`);
	} catch (error) {
		console.error(`[BG-PROCESSOR] Error generating study materials for chapter ${chapterId}:`, error);
		// Don't throw - this is a background job
	}
}

/**
 * Process a chapter in the background
 * - Runs LlamaParse on the PDF
 * - Generates embeddings for chunks
 * - Generates and uploads page screenshots
 * - Generates study materials
 */
export async function processChapterBackground(job: ChapterProcessingJob) {
	const { chapterId, pdfBuffer, fileName, startPage, endPage } = job;
	const bigChapterId = BigInt(chapterId);

	try {
		// Update status to PROCESSING
		await prisma.chapter.update({
			where: { id: bigChapterId },
			data: {
				processing_status: "PROCESSING",
				error_message: null,
			},
		});

		const rangeText = startPage && endPage ? `(Pages ${startPage}-${endPage})` : "(Full Document)";
		console.log(`[BG-PROCESSOR] Starting processing for chapter ${chapterId} ${rangeText}`);

		// 1. Write PDF to temporary file
		const tempFilePath = join(
			tmpdir(),
			`chapter-${chapterId}-${Date.now()}.pdf`
		);
		await writeFile(tempFilePath, pdfBuffer);

		// 2. Run LlamaParse for high-quality parsing
		console.log(`[BG-PROCESSOR] Running LlamaParse...`);
		const parser = new LlamaParseDocumentParser();

		// We pass the whole file to LlamaParse because splitting PDFs before parsing 
		// can be tricky with some libraries, and LlamaParse handles whole docs well.
		// We will filter the pages afterwards.
		const parseResult = await parser.parseFile(tempFilePath);

		// parseFile returns the pages array directly, not an object with pages property
		if (
			!parseResult ||
			!Array.isArray(parseResult) ||
			parseResult.length === 0
		) {
			throw new Error("LlamaParse returned no pages");
		}

		// Filter pages based on chapter range if provided, otherwise use all pages
		let chapterPages = parseResult;
		if (startPage !== undefined && endPage !== undefined) {
			// LlamaParse pages are typically 1-indexed in their 'page' property
			chapterPages = parseResult.filter(p => p.page >= startPage && p.page <= endPage);
		}

		if (chapterPages.length === 0) {
			const rangeMsg = startPage && endPage ? `in range ${startPage}-${endPage}` : "in document";
			console.warn(`[BG-PROCESSOR] No pages found ${rangeMsg}. LlamaParse returned pages: ${parseResult.map(p => p.page).join(', ')}`);
			throw new Error(`No content found ${rangeMsg}`);
		}

		console.log(`[BG-PROCESSOR] Processing ${chapterPages.length} pages (from ${parseResult.length} total)`);

		// 3. Update chapter with LlamaParse content (only relevant pages)
		await prisma.chapter.update({
			where: { id: bigChapterId },
			data: {
				content_json: chapterPages as any,
				parsed_at: new Date(),
			},
		});

		console.log(`[BG-PROCESSOR] Parsed ${chapterPages.length} pages`);

		// Helper function to convert PDF point coordinates to percentages (0-1)
		// This is essential for split-screen citation highlighting to work correctly
		function convertBBoxToPercentages(
			bbox: { x: number; y: number; w: number; h: number },
			actualPageWidth: number = 595,
			actualPageHeight: number = 842
		): number[] {
			// Validate bbox values and handle null/undefined
			const x = bbox.x ?? 0;
			const y = bbox.y ?? 0;
			const w = bbox.w ?? 1;
			const h = bbox.h ?? 1;

			// Ensure dimensions are valid (greater than 0)
			if (actualPageWidth <= 0 || actualPageHeight <= 0) {
				console.warn(
					`[BG-PROCESSOR] Invalid page dimensions: ${actualPageWidth}x${actualPageHeight}, using defaults`
				);
				actualPageWidth = 595;
				actualPageHeight = 842;
			}

			return [
				Math.max(0, Math.min(1, x / actualPageWidth)),
				Math.max(0, Math.min(1, y / actualPageHeight)),
				Math.max(0, Math.min(1, w / actualPageWidth)),
				Math.max(0, Math.min(1, h / actualPageHeight)),
			];
		}

		// 4. Create chunks from LlamaParse output
		// ONE chunk per page (consolidate all items on a page)
		const chunks: any[] = [];
		for (const pageData of chapterPages) {
			const items = pageData.items || [];
			const pageWidth = pageData.width || 595; // Default to A4 width
			const pageHeight = pageData.height || 842; // Default to A4 height

			// Consolidate all text items for this page into one chunk
			let fullPageText = "";
			let layoutItemsArray: Array<{ text: string; bbox: number[] }> = [];

			for (const item of items) {
				if (!item.md || item.md.trim().length === 0) continue;

				const text = item.md.trim();
				fullPageText += text + "\n\n";

				// Collect bbox information for split-screen citations
				const itemBBox = item.bbox || item.bBox;
				if (itemBBox && typeof itemBBox === "object") {
					if (
						typeof itemBBox.x === "number" &&
						typeof itemBBox.y === "number" &&
						typeof itemBBox.w === "number" &&
						typeof itemBBox.h === "number"
					) {
						const bbox = convertBBoxToPercentages(itemBBox, pageWidth, pageHeight);
						const textSnippet = text; // Store full text for the overlay
						layoutItemsArray.push({
							text: textSnippet,
							bbox: bbox,
						});
					} else {
						console.warn(
							`[BG-PROCESSOR] Invalid bbox structure for item on page ${pageData.page}:`,
							itemBBox
						);
					}
				}
			}

			// Fallback: if no items but page has text/md, use that
			if (!fullPageText.trim() && (pageData.text || pageData.md)) {
				fullPageText = (pageData.text || pageData.md || "").trim();
			}

			// Skip empty pages
			if (!fullPageText.trim()) {
				continue;
			}

			// Create ONE chunk per page with all content
			// Store layout items array in bbox field for split-screen citations
			chunks.push({
				content: fullPageText.trim(),
				page_number: pageData.page,
				bbox: layoutItemsArray.length > 0 ? layoutItemsArray : null, // Array of bbox items for this page
			});
		}

		console.log(`[BG-PROCESSOR] Created ${chunks.length} chunks (one per page)`);

		// 5. Insert chunks into database
		const chapter = await prisma.chapter.findUnique({
			where: { id: bigChapterId },
			select: { subject_id: true, accessible_boards: true, is_global: true },
		});

		if (!chapter) throw new Error("Chapter not found");

		const createdChunks = await Promise.all(
			chunks.map((chunk, index) =>
				prisma.chapterChunk.create({
					data: {
						chapter_id: bigChapterId,
						chunk_index: index,
						content: chunk.content,
						page_number: chunk.page_number,
						bbox: chunk.bbox,
						subject_id: chapter.subject_id,
					},
				})
			)
		);

		console.log(
			`[BG-PROCESSOR] Inserted ${createdChunks.length} chunks into DB`
		);

		// 6. Create chapter_chunk_boards entries for board access
		// This is critical for the hybrid search query to find chunks
		if (!chapter.is_global && chapter.accessible_boards.length > 0) {
			console.log(
				`[BG-PROCESSOR] Creating board access entries for ${createdChunks.length} chunks...`
			);

			const boardEntries = [];
			for (const chunk of createdChunks) {
				for (const boardId of chapter.accessible_boards) {
					boardEntries.push({
						chunk_id: chunk.id,
						board_id: boardId,
					});
				}
			}

			// Batch insert board access entries
			if (boardEntries.length > 0) {
				await prisma.chapterChunkBoard.createMany({
					data: boardEntries,
				});
				console.log(
					`[BG-PROCESSOR] Created ${boardEntries.length} board access entries`
				);
			}
		} else if (chapter.is_global) {
			console.log(
				`[BG-PROCESSOR] Chapter is global, skipping board access entries`
			);
		} else {
			console.warn(
				`[BG-PROCESSOR] Chapter has no accessible_boards and is not global - chunks may not be searchable!`
			);
		}

		// 7. Get chapter and subject info for search_vector generation
		const chapterInfo = await prisma.chapter.findUnique({
			where: { id: bigChapterId },
			select: {
				title: true,
				subject: {
					select: {
						name: true,
					},
				},
			},
		});

		if (!chapterInfo) {
			throw new Error("Chapter not found for vector generation");
		}

		// 8. Generate embeddings and search vectors for chunks
		console.log(`[BG-PROCESSOR] Generating embeddings and search vectors...`);

		for (const chunk of createdChunks) {
			// Generate semantic vector
			const embedding = await SemanticVectorService.generateEmbedding(
				chunk.content
			);

			// Generate search_vector (tsvector) with weighted fields:
			// - Chapter title: weight 'A' (highest priority)
			// - Subject name: weight 'B' (medium priority)
			// - Chunk content: weight 'C' (lower priority)
			await prisma.$executeRaw`
                UPDATE "chapter_chunks"
                SET semantic_vector = ${JSON.stringify(embedding)}::vector,
                    search_vector = setweight(to_tsvector('english', COALESCE(${chapterInfo.title || ""
				}, '')), 'A') ||
                                   setweight(to_tsvector('english', COALESCE(${chapterInfo.subject.name || ""
				}, '')), 'B') ||
                                   setweight(to_tsvector('english', COALESCE(${chunk.content || ""
				}, '')), 'C')
                WHERE id = ${chunk.id}
            `;
		}

		console.log(
			`[BG-PROCESSOR] Generated embeddings and search vectors for all chunks`
		);

		// 9. Generate page screenshots and upload to Supabase
		console.log(`[BG-PROCESSOR] Generating page screenshots...`);
		const outputDir = join(tmpdir(), `chapter-${chapterId}-images`);
		const imagePaths = await generatePageImages(
			tempFilePath,
			outputDir,
			chapterId,
			startPage,
			endPage
		);

		const imageUrls = await uploadPageImages(
			imagePaths,
			`chapter-${chapterId}`
		);

		// 10. Create ChapterPage records
		const pageRecords = parseResult.map((page: any) => ({
			chapter_id: bigChapterId,
			page_number: page.page,
			image_url: imageUrls.get(page.page) || "",
			width: page.width || null,
			height: page.height || null,
		}));

		await prisma.chapterPage.createMany({
			data: pageRecords,
		});

		console.log(`[BG-PROCESSOR] Created ${pageRecords.length} page records`);

		// 9. Clean up temporary files
		await unlink(tempFilePath);

		// 12. Update status to COMPLETED
		await prisma.chapter.update({
			where: { id: bigChapterId },
			data: {
				processing_status: "COMPLETED",
				processed_at: new Date(),
				error_message: null,
			},
		});

		console.log(`[BG-PROCESSOR] Chapter ${chapterId} completed successfully`);

		// 13. Generate study materials in background (non-blocking)
		console.log(`[BG-PROCESSOR] Triggering study materials generation...`);
		generateStudyMaterialsBackground(chapterId, chapterInfo)
			.then(() => console.log(`[BG-PROCESSOR] Study materials generated for chapter ${chapterId}`))
			.catch((err: any) => console.error(`[BG-PROCESSOR] Failed to generate study materials:`, err));

	} catch (error: any) {
		console.error(
			`[BG-PROCESSOR] Error processing chapter ${chapterId}:`,
			error
		);

		// Update status to FAILED with error message
		await prisma.chapter.update({
			where: { id: bigChapterId },
			data: {
				processing_status: "FAILED",
				error_message: error.message || "Unknown error during processing",
			},
		});

		throw error;
	}
}

/**
 * Process multiple chapters in sequence
 */
export async function processBatchChapters(jobs: ChapterProcessingJob[]) {
	const results = [];

	for (const job of jobs) {
		try {
			await processChapterBackground(job);
			results.push({ chapterId: job.chapterId, success: true });
		} catch (error) {
			results.push({
				chapterId: job.chapterId,
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return results;
}
