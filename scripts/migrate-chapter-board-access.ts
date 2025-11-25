/**
 * Migration script to populate board access for existing chapters
 * Derives board access from Subject → Program → Board hierarchy
 * 
 * Run with: npx tsx scripts/migrate-chapter-board-access.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function migrateChapterBoardAccess() {
    console.log('🔄 Starting chapter board access migration...\n');

    try {
        // Get all chapters that need board access populated
        // (empty accessible_boards AND is_global = false)
        const chapters = await prisma.chapter.findMany({
            where: {
                accessible_boards: { equals: [] },
                is_global: false,
            },
            include: {
                subject: {
                    include: {
                        program: {
                            include: {
                                board: true,
                            },
                        },
                    },
                },
            },
        });

        console.log(`Found ${chapters.length} chapters without board access\n`);

        if (chapters.length === 0) {
            console.log('✅ No chapters need migration. All chapters already have board access configured.');
            return;
        }

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const chapter of chapters) {
            try {
                const subjectBoardId = chapter.subject.program.board_id;

                if (!subjectBoardId) {
                    console.warn(`⚠️  Chapter ${chapter.id} (${chapter.title}): Subject has no program/board, skipping`);
                    skipped++;
                    continue;
                }

                // Update chapter with board access from subject's program
                await prisma.chapter.update({
                    where: { id: chapter.id },
                    data: {
                        accessible_boards: [subjectBoardId],
                        is_global: false, // Explicitly set to false
                        is_active: true, // Also ensure is_active is true
                    },
                });

                console.log(
                    `✅ Updated chapter ${chapter.id}: "${chapter.title}" → Board: ${subjectBoardId}`
                );
                updated++;
            } catch (error: any) {
                console.error(
                    `❌ Error updating chapter ${chapter.id}: ${error.message}`
                );
                errors++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⚠️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log(`   📝 Total: ${chapters.length}`);

        if (updated > 0) {
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
migrateChapterBoardAccess()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error);
        process.exit(1);
    });

