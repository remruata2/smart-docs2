/**
 * Migration script to regenerate chapter chunks as one chunk per page
 * 
 * This script:
 * 1. Finds all chapters with existing chunks
 * 2. Deletes old chunks and their board access entries
 * 3. Recreates chunks from content_json (LlamaParse data) using one-chunk-per-page logic
 * 4. Regenerates embeddings and search vectors
 * 5. Recreates board access entries
 * 
 * Run with: npx tsx scripts/migrate-chapter-chunks-to-page-level.ts
 */

import 'dotenv/config';
import { PrismaClient, Prisma } from '../src/generated/prisma';
import { SemanticVectorService } from '../src/lib/semantic-vector';

const prisma = new PrismaClient();

/**
 * Convert PDF point coordinates to percentages (0-1)
 */
function convertBBoxToPercentages(
	bbox: { x: number; y: number; w: number; h: number },
	actualPageWidth: number = 595,
	actualPageHeight: number = 842
): number[] {
	const x = bbox.x ?? 0;
	const y = bbox.y ?? 0;
	const w = bbox.w ?? 1;
	const h = bbox.h ?? 1;

	if (actualPageWidth <= 0 || actualPageHeight <= 0) {
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

async function migrateChapterChunksToPageLevel() {
	console.log('🔄 Starting migration to page-level chunks for chapters...\n');

	try {
		// Get all chapters that have chunks and content_json
		const chapters = await prisma.chapter.findMany({
			where: {
				content_json: { not: Prisma.DbNull },
				processing_status: 'COMPLETED',
			},
			include: {
				chunks: {
					select: { id: true },
					take: 1, // Just check if chunks exist
				},
				subject: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				id: 'asc',
			},
		});

		console.log(`📊 Found ${chapters.length} chapters with content_json\n`);

		if (chapters.length === 0) {
			console.log('✅ No chapters need migration.');
			return;
		}

		let totalChaptersProcessed = 0;
		let totalChunksCreated = 0;
		let totalChunksDeleted = 0;
		let totalBoardEntriesCreated = 0;
		let errorCount = 0;

		for (const chapter of chapters) {
			try {
				const chapterId = chapter.id;
				const contentJson = chapter.content_json as any;

				if (!Array.isArray(contentJson) || contentJson.length === 0) {
					console.warn(
						`⚠️  Chapter ${chapterId} (${chapter.title}): content_json is not a valid pages array, skipping`
					);
					continue;
				}

				// Count existing chunks
				const existingChunkCount = await prisma.chapterChunk.count({
					where: { chapter_id: chapterId },
				});

				if (existingChunkCount === 0) {
					console.log(
						`⏭️  Chapter ${chapterId} (${chapter.title}): No existing chunks, skipping`
					);
					continue;
				}

				console.log(
					`\n📖 Processing chapter ${chapterId}: "${chapter.title}"`
				);
				console.log(`   Existing chunks: ${existingChunkCount}`);
				console.log(`   Pages in content_json: ${contentJson.length}`);

				// 1. Delete existing board access entries
				const existingChunks = await prisma.chapterChunk.findMany({
					where: { chapter_id: chapterId },
					select: { id: true },
				});

				const chunkIds = existingChunks.map((c) => c.id);
				if (chunkIds.length > 0) {
					await prisma.chapterChunkBoard.deleteMany({
						where: { chunk_id: { in: chunkIds } },
					});
					console.log(`   ✅ Deleted board access entries for ${chunkIds.length} chunks`);
				}

				// 2. Delete existing chunks
				await prisma.chapterChunk.deleteMany({
					where: { chapter_id: chapterId },
				});
				totalChunksDeleted += existingChunkCount;
				console.log(`   ✅ Deleted ${existingChunkCount} old chunks`);

				// 3. Create new chunks (one per page)
				const newChunks: any[] = [];
				for (const pageData of contentJson) {
					const items = pageData.items || [];
					const pageWidth = pageData.width || 595;
					const pageHeight = pageData.height || 842;

					// Consolidate all text items for this page into one chunk
					let fullPageText = '';
					let layoutItemsArray: Array<{ text: string; bbox: number[] }> = [];

					for (const item of items) {
						if (!item.md || item.md.trim().length === 0) continue;

						const text = item.md.trim();
						fullPageText += text + '\n\n';

						// Collect bbox information for split-screen citations
						const itemBBox = item.bbox || item.bBox;
						if (itemBBox && typeof itemBBox === 'object') {
							if (
								typeof itemBBox.x === 'number' &&
								typeof itemBBox.y === 'number' &&
								typeof itemBBox.w === 'number' &&
								typeof itemBBox.h === 'number'
							) {
								const bbox = convertBBoxToPercentages(
									itemBBox,
									pageWidth,
									pageHeight
								);
								const textSnippet = text.substring(0, 200);
								layoutItemsArray.push({
									text: textSnippet,
									bbox: bbox,
								});
							}
						}
					}

					// Fallback: if no items but page has text/md, use that
					if (!fullPageText.trim() && (pageData.text || pageData.md)) {
						fullPageText = (pageData.text || pageData.md || '').trim();
					}

					// Skip empty pages
					if (!fullPageText.trim()) {
						continue;
					}

					// Create ONE chunk per page
					newChunks.push({
						content: fullPageText.trim(),
						page_number: pageData.page,
						bbox: layoutItemsArray.length > 0 ? layoutItemsArray : null,
					});
				}

				console.log(`   📝 Created ${newChunks.length} new chunks (one per page)`);

				// 4. Insert new chunks into database
				const createdChunks = await Promise.all(
					newChunks.map((chunk, index) =>
						prisma.chapterChunk.create({
							data: {
								chapter_id: chapterId,
								chunk_index: index,
								content: chunk.content,
								page_number: chunk.page_number,
								bbox: chunk.bbox,
								subject_id: chapter.subject_id,
							},
						})
					)
				);

				totalChunksCreated += createdChunks.length;
				console.log(`   ✅ Inserted ${createdChunks.length} chunks into DB`);

				// 5. Create board access entries
				if (!chapter.is_global && chapter.accessible_boards.length > 0) {
					const boardEntries = [];
					for (const chunk of createdChunks) {
						for (const boardId of chapter.accessible_boards) {
							boardEntries.push({
								chunk_id: chunk.id,
								board_id: boardId,
							});
						}
					}

					if (boardEntries.length > 0) {
						await prisma.chapterChunkBoard.createMany({
							data: boardEntries,
						});
						totalBoardEntriesCreated += boardEntries.length;
						console.log(
							`   ✅ Created ${boardEntries.length} board access entries`
						);
					}
				} else if (chapter.is_global) {
					console.log(`   ℹ️  Chapter is global, skipping board access entries`);
				}

				// 6. Generate embeddings and search vectors
				console.log(`   🔄 Generating embeddings and search vectors...`);

				for (const chunk of createdChunks) {
					// Generate semantic vector
					const embedding = await SemanticVectorService.generateEmbedding(
						chunk.content
					);

					// Generate search_vector (tsvector) with weighted fields
					await prisma.$executeRaw`
                        UPDATE "chapter_chunks"
                        SET semantic_vector = ${JSON.stringify(embedding)}::vector,
                            search_vector = setweight(to_tsvector('english', COALESCE(${chapter.title || ''
						}, '')), 'A') ||
                                           setweight(to_tsvector('english', COALESCE(${chapter.subject.name || ''
						}, '')), 'B') ||
                                           setweight(to_tsvector('english', COALESCE(${chunk.content || ''
						}, '')), 'C')
                        WHERE id = ${chunk.id}
                    `;
				}

				console.log(
					`   ✅ Generated embeddings and search vectors for all chunks`
				);

				totalChaptersProcessed++;

				if (totalChaptersProcessed % 5 === 0) {
					console.log(`\n   📊 Progress: ${totalChaptersProcessed}/${chapters.length} chapters processed...`);
				}
			} catch (error: any) {
				console.error(
					`❌ Error processing chapter ${chapter.id}: ${error.message}`
				);
				console.error(error.stack);
				errorCount++;
			}
		}

		console.log('\n📊 Migration Summary:');
		console.log('================');
		console.log(`   ✅ Chapters processed: ${totalChaptersProcessed}`);
		console.log(`   📝 New chunks created: ${totalChunksCreated}`);
		console.log(`   🗑️  Old chunks deleted: ${totalChunksDeleted}`);
		console.log(`   🔗 Board entries created: ${totalBoardEntriesCreated}`);
		console.log(`   ❌ Errors: ${errorCount}`);
		console.log(`   📚 Total chapters: ${chapters.length}`);

		if (totalChaptersProcessed > 0) {
			console.log('\n✅ Migration completed successfully!');
		}
	} catch (error: any) {
		console.error('\n💥 Migration failed:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Run migration
migrateChapterChunksToPageLevel()
	.then(() => {
		console.log('\n🎉 Done!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n💥 Migration error:', error);
		process.exit(1);
	});

