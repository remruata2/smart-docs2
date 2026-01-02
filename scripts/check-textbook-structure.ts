import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    // Get the latest textbook
    const textbook = await prisma.textbook.findFirst({
        orderBy: { created_at: 'desc' },
        include: {
            units: {
                include: {
                    chapters: true
                }
            }
        }
    });

    if (!textbook) {
        console.log("No textbooks found.");
        return;
    }

    console.log(`Checking Textbook: ${textbook.title} (ID: ${textbook.id})`);
    console.log(`Stream: ${textbook.stream}`);
    console.log(`Subject: ${textbook.subject_name}`);

    for (const unit of textbook.units) {
        console.log(`\nUnit ${unit.order}: ${unit.title}`);
        for (const chapter of unit.chapters) {
            console.log(`  Chapter ${chapter.chapter_number}: ${chapter.title}`);
            const subtopics = chapter.subtopics;
            console.log('    Raw Subtopics:', JSON.stringify(subtopics));

            if (Array.isArray(subtopics)) {
                console.log(`    Subtopics (${subtopics.length}):`);
                subtopics.forEach((s: any) => console.log(`      - ${s}`));
            } else if (typeof subtopics === 'string') {
                console.log(`    Subtopics (String): ${subtopics}`);
            } else {
                console.log(`    [WARNING] Subtopics is not an array! Type: ${typeof subtopics}`);
            }
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
