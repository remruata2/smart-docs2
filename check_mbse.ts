
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.board.update({
        where: { id: 'MBSE' },
        data: { hide_textbook: true },
        select: { id: true, name: true, hide_textbook: true }
    });
    console.log(JSON.stringify(updated, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
