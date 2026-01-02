import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function checkChapter(id: number) {
    const chapter = await prisma.textbookChapter.findUnique({
        where: { id },
        include: {
            images: true
        }
    });

    if (!chapter) {
        console.log('Chapter not found');
        return;
    }

    console.log(`Chapter: ${chapter.title}`);
    console.log(`Status: ${chapter.status}`);
    console.log(`Has Content: ${!!chapter.content}`);
    console.log('Images:');
    chapter.images.forEach(img => {
        console.log(`- ID: ${img.id}, Status: ${img.status}, Placement: "${img.placement}", URL: ${img.url ? 'YES' : 'NO'}`);
    });
}

// Get latest chapter
async function getLatest() {
    const chapter = await prisma.textbookChapter.findFirst({
        orderBy: { updated_at: 'desc' },
        select: { id: true }
    });
    if (chapter) {
        await checkChapter(Number(chapter.id));
    }
}

getLatest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
