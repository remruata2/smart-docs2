import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Custom Content infrastructure...');

    // 1. Create or update the USER_CONTENT board
    const board = await prisma.board.upsert({
        where: { id: 'USER_CONTENT' },
        update: {
            name: 'User Content',
            type: 'custom',
            is_active: true
        },
        create: {
            id: 'USER_CONTENT',
            name: 'User Content',
            type: 'custom',
            is_active: true
        }
    });
    console.log('Board "USER_CONTENT" ensured.');

    // 2. Create or update the Custom Content program
    // Subjects require a program_id
    let program = await prisma.program.findFirst({
        where: {
            board_id: 'USER_CONTENT',
            institution_id: null,
            name: 'Custom Content'
        }
    });

    if (program) {
        program = await prisma.program.update({
            where: { id: program.id },
            data: {
                is_active: true,
                exam_category: 'academic_board'
            }
        });
        console.log('Program "Custom Content" updated.');
    } else {
        program = await prisma.program.create({
            data: {
                board_id: 'USER_CONTENT',
                institution_id: null as any,
                name: 'Custom Content',
                is_active: true,
                exam_category: 'academic_board'
            }
        });
        console.log('Program "Custom Content" created.');
    }

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
