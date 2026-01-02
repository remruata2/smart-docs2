import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    // Get the latest syllabus (ID 106 from log, or just find BIOLOGY XII)
    const syllabus = await prisma.syllabus.findFirst({
        where: { subject: 'BIOLOGY', class_level: 'Class XII' },
        include: {
            units: {
                include: {
                    chapters: true
                }
            }
        }
    });

    if (!syllabus) {
        console.log("No syllabus found.");
        return;
    }

    console.log(`Checking Syllabus: ${syllabus.title} (ID: ${syllabus.id})`);

    for (const unit of syllabus.units) {
        console.log(`\nUnit ${unit.order}: ${unit.title}`);
        for (const chapter of unit.chapters) {
            console.log(`  Chapter ${chapter.chapter_number}: ${chapter.title}`);
            const subtopics = chapter.subtopics;

            if (Array.isArray(subtopics)) {
                console.log(`    Subtopics (${subtopics.length}):`);
                subtopics.slice(0, 5).forEach((s: any) => console.log(`      - ${s}`));
                if (subtopics.length > 5) console.log(`      ... and ${subtopics.length - 5} more`);
            } else {
                console.log(`    [WARNING] Subtopics is not an array! Type: ${typeof subtopics} Value: ${JSON.stringify(subtopics)}`);
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
