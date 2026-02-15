
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBoard() {
    const board = await prisma.board.findUnique({
        where: { id: 'MBSE' },
        select: { id: true, name: true, hide_textbook: true }
    });
    console.log(JSON.stringify(board, null, 2));
}

checkBoard()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
