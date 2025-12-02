
import { prisma } from "./src/lib/prisma";

async function checkQuestions() {
    try {
        const chapters = await prisma.chapter.findMany({
            take: 5,
            include: {
                _count: {
                    select: { questions: true }
                }
            }
        });

        console.log("Chapters and Question Counts:");
        for (const c of chapters) {
            console.log(`Chapter: ${c.title} (ID: ${c.id}) - Questions: ${c._count.questions}`);

            if (c._count.questions > 0) {
                const questions = await prisma.question.findMany({
                    where: { chapter_id: c.id },
                    select: { question_type: true, difficulty: true }
                });

                const stats = questions.reduce((acc: any, q) => {
                    const key = `${q.question_type}-${q.difficulty}`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
                console.log("  Stats:", stats);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkQuestions();
