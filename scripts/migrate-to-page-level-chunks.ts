import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

/**
 * Migration script to convert existing micro-chunks to page-level chunks
 * 
 * This script:
 * 1. Groups existing chunks by file_id and page_number
 * 2. Aggregates content into full page text
 * 3. Creates layout items from existing chunks (for fuzzy matching)
 * 4. Creates new page-level chunks
 * 5. Deletes old micro-chunks
 * 6. Updates search vectors
 */

interface OldChunk {
	id: number;
	file_id: number;
	chunk_index: number;
	content: string;
	page_number: number | null;
	bbox: any;
}

interface PageChunkData {
	file_id: number;
	page_number: number;
	chunks: OldChunk[];
	fullText: string;
	layoutItems: Array<{ text: string; bbox: number[] }>;
}

async function migrateToPageLevelChunks() {
	console.log("🔄 Starting migration to page-level chunks...\n");

	try {
		// Get all files that have chunks
		const filesWithChunks = await prisma.$queryRaw<Array<{ file_id: number }>>`
			SELECT DISTINCT file_id
			FROM file_chunks
			ORDER BY file_id
		`;

		console.log(`📊 Found ${filesWithChunks.length} files with chunks\n`);

		let totalFilesProcessed = 0;
		let totalChunksCreated = 0;
		let totalChunksDeleted = 0;
		let errorCount = 0;

		for (const file of filesWithChunks) {
			try {
				// Get all chunks for this file, ordered by page_number and chunk_index
				const chunks = await prisma.fileChunk.findMany({
					where: { file_id: file.file_id },
					orderBy: [
						{ page_number: "asc" },
						{ chunk_index: "asc" },
					],
					select: {
						id: true,
						file_id: true,
						chunk_index: true,
						content: true,
						page_number: true,
						bbox: true,
					},
				});

				if (chunks.length === 0) continue;

				// Group chunks by page_number
				const chunksByPage = new Map<number, OldChunk[]>();
				
				for (const chunk of chunks) {
					const pageNum = chunk.page_number || 1; // Default to page 1 if null
					if (!chunksByPage.has(pageNum)) {
						chunksByPage.set(pageNum, []);
					}
					chunksByPage.get(pageNum)!.push(chunk);
				}

				// Process each page
				const pageChunks: PageChunkData[] = [];

				for (const [pageNumber, pageChunksList] of chunksByPage.entries()) {
					// Aggregate content
					const fullText = pageChunksList
						.map((c) => c.content.trim())
						.filter((text) => text.length > 0)
						.join("\n\n");

					if (!fullText.trim()) continue;

					// Create layout items from existing chunks
					// Each old chunk becomes a layout item for fuzzy matching
					const layoutItems: Array<{ text: string; bbox: number[] }> = [];

					for (const chunk of pageChunksList) {
						if (!chunk.bbox) continue;

						// Check if bbox is in old format (simple array) or already new format
						let bboxArray: number[] | null = null;

						if (Array.isArray(chunk.bbox)) {
							if (chunk.bbox.length === 4 && typeof chunk.bbox[0] === "number") {
								// Old format: [x, y, w, h]
								bboxArray = chunk.bbox as number[];
							} else if (
								chunk.bbox.length > 0 &&
								typeof chunk.bbox[0] === "object" &&
								chunk.bbox[0].bbox
							) {
								// Already in new format, extract bboxes
								for (const item of chunk.bbox as Array<{ text: string; bbox: number[] }>) {
									layoutItems.push({
										text: item.text.substring(0, 200), // Limit text length
										bbox: item.bbox,
									});
								}
								continue; // Skip to next chunk
							}
						}

						// If we have a valid bbox array, create layout item
						if (bboxArray && bboxArray.length === 4) {
							layoutItems.push({
								text: chunk.content.trim().substring(0, 200), // Use chunk content as text snippet
								bbox: bboxArray,
							});
						}
					}

					pageChunks.push({
						file_id: file.file_id,
						page_number: pageNumber,
						chunks: pageChunksList,
						fullText,
						layoutItems: layoutItems.length > 0 ? layoutItems : [],
					});
				}

				// Check if this file already has page-level chunks
				// (If chunks are already aggregated, skip this file)
				const hasPageLevelChunks = pageChunks.some(
					(pc) => pc.chunks.length === 1 && pc.chunks[0].content.length > 500
				);

				if (hasPageLevelChunks && pageChunks.length === chunks.length) {
					console.log(`  ⏭️  File ${file.file_id}: Already in page-level format, skipping`);
					continue;
				}

				// Create new page-level chunks
				let newChunkIndex = 0;
				const newChunkIds: number[] = [];

				for (const pageChunk of pageChunks) {
					// Create new chunk with aggregated content
					const newChunk = await prisma.fileChunk.create({
						data: {
							file_id: pageChunk.file_id,
							chunk_index: newChunkIndex++,
							content: pageChunk.fullText,
							page_number: pageChunk.page_number,
							// Store layout items if available, otherwise use first chunk's bbox or full page
							bbox:
								pageChunk.layoutItems.length > 0
									? pageChunk.layoutItems
									: (pageChunk.chunks[0]?.bbox && Array.isArray(pageChunk.chunks[0].bbox) && pageChunk.chunks[0].bbox.length === 4)
										? pageChunk.chunks[0].bbox
										: [0, 0, 1, 1],
						},
					});

					newChunkIds.push(newChunk.id);

					// Update search_vector for the new chunk
					await prisma.$executeRaw`
						UPDATE file_chunks
						SET search_vector = to_tsvector('english', ${pageChunk.fullText})
						WHERE id = ${newChunk.id}
					`;

					totalChunksCreated++;
				}

				// Delete old micro-chunks
				const oldChunkIds = pageChunks.flatMap((pc) => pc.chunks.map((c) => c.id));
				await prisma.fileChunk.deleteMany({
					where: {
						id: {
							in: oldChunkIds,
						},
					},
				});

				totalChunksDeleted += oldChunkIds.length;

				totalFilesProcessed++;

				if (totalFilesProcessed % 10 === 0) {
					console.log(`  ✓ Processed ${totalFilesProcessed} files...`);
				}
			} catch (error) {
				console.error(
					`  ❌ Error processing file ${file.file_id}:`,
					error instanceof Error ? error.message : error
				);
				errorCount++;
			}
		}

		console.log("\n✅ Migration completed!\n");
		console.log(`   Files processed: ${totalFilesProcessed}`);
		console.log(`   New chunks created: ${totalChunksCreated}`);
		console.log(`   Old chunks deleted: ${totalChunksDeleted}`);
		console.log(`   Errors: ${errorCount}`);

		if (totalChunksCreated > 0) {
			console.log(
				"\n💡 Next steps:"
			);
			console.log(
				"   1. Regenerate semantic vectors: npm run generate:vectors"
			);
			console.log(
				"   2. Test search and citation highlighting"
			);
		}
	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the migration
migrateToPageLevelChunks()
	.then(() => {
		console.log("\n✨ Migration script completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Migration script failed:", error);
		process.exit(1);
	});

