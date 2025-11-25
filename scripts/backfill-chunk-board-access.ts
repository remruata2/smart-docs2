/**
 * Migration script to backfill chapter_chunk_boards entries for existing chunks
 * 
 * This script creates board access entries for chunks that were created before
 * we added board access entry creation to the chapter processing pipeline.
 * 
 * Run with: npx tsx scripts/backfill-chunk-board-access.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function backfillChunkBoardAccess() {
    console.log('🔄 Starting chapter_chunk_boards backfill...\n');

    try {
        // Find all chunks that don't have board access entries
        // and their chapters have accessible_boards defined
        const chunksWithoutBoardAccess = await prisma.$queryRaw<Array<{
            chunk_id: bigint;
            chapter_id: bigint;
            chapter_title: string;
            is_global: boolean;
            accessible_boards: string[];
        }>>`
            SELECT 
                cc.id as chunk_id,
                c.id as chapter_id,
                c.title as chapter_title,
                c.is_global,
                c.accessible_boards
            FROM chapter_chunks cc
            JOIN chapters c ON cc.chapter_id = c.id
            LEFT JOIN chapter_chunk_boards ccb ON cc.id = ccb.chunk_id
            WHERE ccb.chunk_id IS NULL
              AND c.is_active = true
              AND c.processing_status = 'COMPLETED'
            GROUP BY cc.id, c.id, c.title, c.is_global, c.accessible_boards
            ORDER BY c.id, cc.id
        `;

        console.log(`Found ${chunksWithoutBoardAccess.length} chunks without board access entries\n`);

        if (chunksWithoutBoardAccess.length === 0) {
            console.log('✅ No chunks need migration. All chunks already have board access entries.');
            return;
        }

        // Group chunks by chapter for batch processing
        const chunksByChapter = new Map<bigint, typeof chunksWithoutBoardAccess>();
        for (const chunk of chunksWithoutBoardAccess) {
            if (!chunksByChapter.has(chunk.chapter_id)) {
                chunksByChapter.set(chunk.chapter_id, []);
            }
            chunksByChapter.get(chunk.chapter_id)!.push(chunk);
        }

        console.log(`Processing ${chunksByChapter.size} chapters...\n`);

        let totalEntriesCreated = 0;
        let chaptersProcessed = 0;
        let chaptersSkipped = 0;
        let errors = 0;

        for (const [chapterId, chunks] of chunksByChapter.entries()) {
            try {
                const firstChunk = chunks[0];
                
                // Skip global chapters (they don't need board access entries)
                if (firstChunk.is_global) {
                    console.log(`⏭️  Chapter ${chapterId} ("${firstChunk.chapter_title}") is global, skipping ${chunks.length} chunks`);
                    chaptersSkipped++;
                    continue;
                }

                // Skip chapters with no accessible_boards
                if (!firstChunk.accessible_boards || firstChunk.accessible_boards.length === 0) {
                    console.warn(`⚠️  Chapter ${chapterId} ("${firstChunk.chapter_title}") has no accessible_boards, skipping ${chunks.length} chunks`);
                    chaptersSkipped++;
                    continue;
                }

                // Create board access entries for all chunks in this chapter
                const boardEntries = [];
                for (const chunk of chunks) {
                    for (const boardId of firstChunk.accessible_boards) {
                        boardEntries.push({
                            chunk_id: chunk.chunk_id,
                            board_id: boardId,
                        });
                    }
                }

                // Batch insert board access entries
                if (boardEntries.length > 0) {
                    await prisma.chapterChunkBoard.createMany({
                        data: boardEntries,
                        skipDuplicates: true, // Skip if entry already exists
                    });
                    totalEntriesCreated += boardEntries.length;
                    chaptersProcessed++;
                    console.log(
                        `✅ Chapter ${chapterId} ("${firstChunk.chapter_title}"): Created ${boardEntries.length} board access entries for ${chunks.length} chunks`
                    );
                }
            } catch (error: any) {
                console.error(`❌ Error processing chapter ${chapterId}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Chapters processed: ${chaptersProcessed}`);
        console.log(`   ⏭️  Chapters skipped: ${chaptersSkipped} (global or no boards)`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log(`   📝 Total board access entries created: ${totalEntriesCreated}`);
        console.log(`   📦 Total chunks processed: ${chunksWithoutBoardAccess.length}`);

        if (totalEntriesCreated > 0) {
            console.log('\n✅ Migration completed successfully!');
            console.log('   All chunks now have board access entries for search.');
        }
    } catch (error: any) {
        console.error('\n💥 Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
backfillChunkBoardAccess()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error);
        process.exit(1);
    });

