import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ quizId: string }> }
) {
    const { quizId } = await params;
    console.log(`[DEBUG-MOBILE-QUIZ] Incoming request for ID: ${quizId}`);

    try {
        const user = await getMobileUser(request);
        console.log(`[DEBUG-MOBILE-QUIZ] Authenticated user: ${user.email} (ID: ${user.id})`);

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
                        explanation: true,
                        correct_answer: true,
                        user_answer: true,
                        is_correct: true,
                        feedback: true,
                    }
                }
            }
        });

        if (!quiz) {
            console.log(`[DEBUG-MOBILE-QUIZ] Quiz NOT FOUND: ${quizId}`);
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        const isCompleted = quiz.status === 'COMPLETED';

        const formattedQuestions = quiz.questions.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
            // Only reveal results if the quiz is completed
            user_answer: isCompleted ? q.user_answer : undefined,
            is_correct: isCompleted ? q.is_correct : undefined,
            correct_answer: isCompleted ? q.correct_answer : undefined,
            feedback: isCompleted ? q.feedback : undefined,
        }));

        return NextResponse.json({
            id: quiz.id,
            title: quiz.title,
            status: quiz.status,
            questions: formattedQuestions,
            score: quiz.score,
            total_points: quiz.total_points,
            completed_at: quiz.completed_at,
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-QUIZ] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch quiz" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
