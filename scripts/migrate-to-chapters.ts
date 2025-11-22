import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration to chapters...');

    // 1. Ensure Default Board Exists (CBSE)
    const defaultBoardId = 'CBSE';
    const defaultBoard = await prisma.board.findUnique({ where: { id: defaultBoardId } });
    if (!defaultBoard) {
        throw new Error(`Default board ${defaultBoardId} not found. Run seed-boards.ts first.`);
    }

    // 2. Get all FileLists
    const files = await prisma.fileList.findMany({
        include: { chunks: true, pages: true },
    });

    console.log(`Found ${files.length} files to migrate.`);

    for (const file of files) {
        console.log(`Migrating file: ${file.title}`);

        // 3. Create or Find Subject (based on Category)
        const subjectName = file.category || 'General';

        let subject = await prisma.subject.findFirst({
            where: {
                name: subjectName,
                board_id: defaultBoardId
            }
        });

        if (!subject) {
            subject = await prisma.subject.create({
                data: {
                    name: subjectName,
                    board_id: defaultBoardId,
                    class_level: 10, // Defaulting to 10
                }
            });
        }

        // 4. Create Chapter
        const chapter = await prisma.chapter.create({
            data: {
                subject_id: subject.id,
                title: file.title,
                content_json: {}, // Placeholder
                accessible_boards: [defaultBoardId],
                is_global: false,
                created_at: file.created_at || new Date(),
            }
        });

        // 5. Migrate Chunks
        if (file.chunks.length > 0) {
            console.log(`  Migrating ${file.chunks.length} chunks...`);

            for (const chunk of file.chunks) {
                const newChunk = await prisma.chapterChunk.create({
                    data: {
                        chapter_id: chapter.id,
                        chunk_index: chunk.chunk_index,
                        content: chunk.content,
                        page_number: chunk.page_number,
                        bbox: chunk.bbox as any,
                        // Vectors are skipped; need regeneration
                    }
                });

                // Create Junction
                await prisma.chapterChunkBoard.create({
                    data: {
                        chunk_id: newChunk.id,
                        board_id: defaultBoardId
                    }
                });
            }
        }

        // 6. Migrate Pages
        if (file.pages.length > 0) {
            for (const page of file.pages) {
                await prisma.chapterPage.create({
                    data: {
                        chapter_id: chapter.id,
                        page_number: page.page_number,
                        image_url: page.image_url,
                        width: page.width,
                        height: page.height
                    }
                })
            }
        }
    }

    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
