
import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    // Check chapter 345
    const chapterId = BigInt(345);
    const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
            subject: {
                include: {
                    program: {
                        include: {
                            board: true
                        }
                    }
                }
            }
        }
    });

    if (!chapter) {
        console.log("Chapter 345 not found");
        return;
    }

    const board = chapter.subject.program.board;
    console.log(`Chapter 345 belongs to board: ${board.id} (${board.name})`);
    console.log(`hide_textbook: ${board.hide_textbook}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
