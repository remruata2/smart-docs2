const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    const chapters = await prisma.textbookChapter.findMany({
        where: {
            status: 'FAILED',
        },
        select: {
            id: true,
            title: true,
            status: true,
            generation_error: true,
        },
        orderBy: {
            id: 'desc',
        },
        take: 5,
    });

    console.log('--- Failed Chapters ---');
    console.log(JSON.stringify(chapters, null, 2));

    const jobs = await prisma.textbookGenerationJob.findMany({
        where: {
            status: 'FAILED',
        },
        select: {
            id: true,
            status: true,
            error_message: true,
            job_type: true,
            target_id: true,
        },
        orderBy: {
            id: 'desc',
        },
        take: 5,
    });

    console.log('\n--- Failed Jobs ---');
    console.log(JSON.stringify(jobs, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
