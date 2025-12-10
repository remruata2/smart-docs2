import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import QuestionListClient from "./question-list-client";
import { getQuestionStats } from "./actions";

export default async function ChapterQuestionsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        redirect("/");
    }

    const { id } = await params;
    const bigChapterId = BigInt(id);

    // Fetch chapter info
    const chapter = await prisma.chapter.findUnique({
        where: { id: bigChapterId },
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
        redirect("/admin/chapters");
    }

    // Fetch questions
    const questions = await prisma.question.findMany({
        where: { chapter_id: bigChapterId },
        orderBy: [
            { difficulty: 'asc' },
            { created_at: 'desc' }
        ]
    });

    // Get stats
    const stats = await getQuestionStats(id);

    // Serialize for client
    const serializedQuestions = questions.map(q => ({
        ...q,
        chapter_id: q.chapter_id.toString(),
    }));

    const serializedChapter = {
        ...chapter,
        id: chapter.id.toString(),
    };

    return (
        <div className="container mx-auto py-10">
            <QuestionListClient
                chapter={serializedChapter}
                initialQuestions={serializedQuestions}
                stats={stats}
            />
        </div>
    );
}
