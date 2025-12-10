
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Boards ---');
    const boards = await prisma.board.findMany();
    console.log(JSON.stringify(boards, null, 2));

    console.log('\n--- Institutions ---');
    const institutions = await prisma.institution.findMany();
    console.log(JSON.stringify(institutions, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
        , 2));

    console.log('\n--- Programs ---');
    const programs = await prisma.program.findMany();
    console.log(JSON.stringify(programs, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
