
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const chapters = await prisma.chapter.findMany({
            take: 5,
            include: {
                _count: {
                    select: { questions: true }
                }
            }
        });

        const results = [];

        for (const c of chapters) {
            const info: any = {
                chapter: c.title,
                id: c.id.toString(),
                count: c._count.questions
            };

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
                info.stats = stats;
            }
            results.push(info);
        }

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
