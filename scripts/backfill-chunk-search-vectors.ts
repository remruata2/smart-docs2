/**
 * Migration script to backfill search_vector (tsvector) for existing chapter chunks
 * 
 * This script generates search_vector for chunks that were created before
 * we added search_vector generation to the chapter processing pipeline.
 * 
 * Run with: npx tsx scripts/backfill-chunk-search-vectors.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function backfillSearchVectors() {
    console.log('🔄 Starting search_vector backfill for chapter chunks...\n');

    try {
        // Find all chunks that have content but missing or null search_vector
        // Note: search_vector is Unsupported("tsvector") so we need to use raw query
        // First, let's get all chunks and filter in memory, or use a raw query
        const chunksWithNullVector = await prisma.$queryRaw<Array<{ id: bigint }>>`
            SELECT id FROM "chapter_chunks"
            WHERE content IS NOT NULL 
              AND (search_vector IS NULL OR search_vector = ''::tsvector)
            ORDER BY created_at ASC
        `;

        const chunkIds = chunksWithNullVector.map(c => c.id);

        if (chunkIds.length === 0) {
            console.log('✅ No chunks need migration. All chunks already have search_vector.');
            return;
        }

        // Now fetch the chunks with their relations
        const chunks = await prisma.chapterChunk.findMany({
            where: {
                id: {
                    in: chunkIds,
                },
            },
            include: {
                chapter: {
                    include: {
                        subject: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        console.log(`Found ${chunks.length} chunks without search_vector\n`);

        if (chunks.length === 0) {
            console.log('✅ No chunks need migration. All chunks already have search_vector.');
            return;
        }

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches to avoid overwhelming the database
        const BATCH_SIZE = 50;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)...`);

            for (const chunk of batch) {
                try {
                    if (!chunk.content || chunk.content.trim().length === 0) {
                        console.warn(`⚠️  Chunk ${chunk.id}: Empty content, skipping`);
                        skipped++;
                        continue;
                    }

                    if (!chunk.chapter) {
                        console.warn(`⚠️  Chunk ${chunk.id}: Chapter not found, skipping`);
                        skipped++;
                        continue;
                    }

                    const chapterTitle = chunk.chapter.title || '';
                    const subjectName = chunk.chapter.subject?.name || '';
                    const chunkContent = chunk.content || '';

                    // Generate search_vector with weighted fields (same logic as chapter-processor.ts):
                    // - Chapter title: weight 'A' (highest priority)
                    // - Subject name: weight 'B' (medium priority)
                    // - Chunk content: weight 'C' (lower priority)
                    await prisma.$executeRaw`
                        UPDATE "chapter_chunks"
                        SET search_vector = setweight(to_tsvector('english', COALESCE(${chapterTitle}, '')), 'A') ||
                                           setweight(to_tsvector('english', COALESCE(${subjectName}, '')), 'B') ||
                                           setweight(to_tsvector('english', COALESCE(${chunkContent}, '')), 'C')
                        WHERE id = ${chunk.id}
                    `;

                    updated++;
                    
                    // Log progress every 10 chunks
                    if (updated % 10 === 0) {
                        console.log(`   ✅ Updated ${updated}/${chunks.length} chunks...`);
                    }
                } catch (error: any) {
                    console.error(`❌ Error updating chunk ${chunk.id}: ${error.message}`);
                    errors++;
                }
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⚠️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log(`   📝 Total: ${chunks.length}`);

        if (updated > 0) {
            console.log('\n✅ Migration completed successfully!');
            console.log('   All chunks now have search_vector for keyword search.');
        }
    } catch (error: any) {
        console.error('\n💥 Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
backfillSearchVectors()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error);
        process.exit(1);
    });

