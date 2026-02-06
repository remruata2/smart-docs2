
import { prisma } from '../src/lib/prisma';

const BOARDS_TO_ENSURE = [
    { id: 'MPSC', name: 'Mizoram Public Service Commission', type: 'competitive_exam' },
    { id: 'Departmental', name: 'Departmental Exams', type: 'competitive_exam' },
    { id: 'MBSE', name: 'Mizoram Board of School Education', type: 'academic' },
    { id: 'CBSE', name: 'Central Board of Secondary Education', type: 'academic' },
    { id: 'Banking', name: 'Banking Exams (IBPS/SBI)', type: 'competitive_exam' },
    { id: 'Entrance', name: 'Entrance Exams (JEE/NEET/Technical)', type: 'competitive_exam' },
    { id: 'UPSC', name: 'Union Public Service Commission', type: 'competitive_exam' },
];

async function main() {
    console.log('Seeding Boards...');

    for (const board of BOARDS_TO_ENSURE) {
        await prisma.board.upsert({
            where: { id: board.id },
            update: {
                name: board.name,
                type: board.type,
            },
            create: {
                id: board.id,
                name: board.name,
                country_id: 'IN', // Default country
                type: board.type,
            },
        });
        console.log(`Ensured board: ${board.id}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
