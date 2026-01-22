
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function debugSyllabus() {
    console.log("Checking SyllabusChapter with ID 277...");

    // We'll search for SyllabusChapter with ID 277 as shown in the screenshot
    const chapter = await prisma.syllabusChapter.findUnique({
        where: {
            id: 277
        }
    });

    if (!chapter) {
        console.log("SyllabusChapter 277 not found!");
        return;
    }

    console.log(`Found SyllabusChapter 277.`);
    console.log(`Title: ${chapter.title}`);
    console.log(`Subtopics Type: ${typeof chapter.subtopics}`);

    const jsonStr = JSON.stringify(chapter.subtopics, null, 2);
    // Trucate if super long, but keep enough to see structure
    console.log(`Subtopics Value: ${jsonStr.substring(0, 500)}`);
}

debugSyllabus()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
