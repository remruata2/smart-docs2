
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    try {
        // strict check for IDs from previous step
        await prisma.program.update({
            where: { id: 2 }, // Class 10
            data: { exam_category: 'academic_board' }
        });
        console.log("Updated Class 10 MBSE to academic_board");

        await prisma.program.update({
            where: { id: 7 }, // MPSC
            data: { exam_category: 'government_prelims' }
        });
        console.log("Updated MPSC to government_prelims");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
