import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { QuizInterface } from "@/components/practice/QuizInterface";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }
    const userId = parseInt(session.user.id as string);
    const { quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
            questions: {
                select: {
                    id: true,
                    question_text: true,
                    question_type: true,
                    options: true,
                    points: true,
                    // DO NOT SELECT correct_answer or explanation
                },
                orderBy: { id: 'asc' } // Ensure consistent order
            }
        }
    });

    if (!quiz) {
        redirect("/app/practice");
    }

    if (quiz.user_id !== userId) {
        redirect("/app/practice");
    }

    if (quiz.status === "COMPLETED") {
        redirect(`/app/practice/${quizId}/result`);
    }

    // Transform for client component
    const clientQuiz = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions.map(q => ({
            ...q,
            question_type: q.question_type as any
        }))
    };

    return <QuizInterface quiz={clientQuiz} />;
}
