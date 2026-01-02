import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log("Deleting BIOLOGY - Class XII syllabus...");
    const result = await prisma.syllabus.deleteMany({
        where: {
            subject: 'BIOLOGY',
            class_level: 'Class XII'
        }
    });

    console.log(`Deleted ${result.count} records.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
