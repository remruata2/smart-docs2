
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    try {
        const programs = await prisma.program.findMany({
            select: {
                id: true,
                name: true,
                exam_category: true,
                board: { select: { id: true, name: true } }
            }
        });
        console.log("Programs found:", JSON.stringify(programs, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
