import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function check() {
    try {
        const program = await prisma.program.findFirst({
            where: {
                board_id: 'USER_CONTENT',
                name: 'Custom Content'
            }
        });
        console.log('Program:', program ? JSON.stringify(program, (key, value) => typeof value === 'bigint' ? value.toString() : value) : 'null');

        const boards = await prisma.board.findMany({ take: 5 });
        console.log('Boards:', JSON.stringify(boards, (key, value) => typeof value === 'bigint' ? value.toString() : value));

        const subjects = await prisma.subject.findMany({ take: 5 });
        console.log('Subjects:', JSON.stringify(subjects, (key, value) => typeof value === 'bigint' ? value.toString() : value));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
