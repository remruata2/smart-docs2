"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { QuestionType } from "@/generated/prisma";

// Server action to get all questions for a chapter with optional filters
export async function getQuestions(
    chapterId: string,
    filters?: {
        difficulty?: string;
        questionType?: QuestionType;
        search?: string;
    }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const bigChapterId = BigInt(chapterId);

    const where: any = {
        chapter_id: bigChapterId,
    };

    if (filters?.difficulty) {
        where.difficulty = filters.difficulty;
    }

    if (filters?.questionType) {
        where.question_type = filters.questionType;
    }

    if (filters?.search) {
        where.question_text = {
            contains: filters.search,
            mode: 'insensitive'
        };
    }

    const questions = await prisma.question.findMany({
        where,
        orderBy: [
            { difficulty: 'asc' },
            { created_at: 'desc' }
        ]
    });

    // Serialize for client
    return questions.map(q => ({
        ...q,
        chapter_id: q.chapter_id.toString(),
    }));
}

// Server action to create a new question
export async function createQuestion(chapterId: string, data: {
    question_text: string;
    question_type: QuestionType;
    difficulty: string;
    options?: any;
    correct_answer: any;
    explanation?: string;
    points: number;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const bigChapterId = BigInt(chapterId);

    const question = await prisma.question.create({
        data: {
            chapter_id: bigChapterId,
            question_text: data.question_text,
            question_type: data.question_type,
            difficulty: data.difficulty,
            options: data.options || null,
            correct_answer: data.correct_answer,
            explanation: data.explanation || null,
            points: data.points,
            is_active: true,
        }
    });

    revalidatePath(`/admin/chapters/${chapterId}/questions`);

    return {
        ...question,
        chapter_id: question.chapter_id.toString(),
    };
}

// Server action to update a question
export async function updateQuestion(questionId: string, data: {
    question_text?: string;
    question_type?: QuestionType;
    difficulty?: string;
    options?: any;
    correct_answer?: any;
    explanation?: string;
    points?: number;
    is_active?: boolean;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const question = await prisma.question.update({
        where: { id: questionId },
        data: {
            ...data,
            updated_at: new Date(),
        }
    });

    // Get chapter_id for revalidation
    const chapterId = question.chapter_id.toString();
    revalidatePath(`/admin/chapters/${chapterId}/questions`);

    return {
        ...question,
        chapter_id: question.chapter_id.toString(),
    };
}

// Server action to delete a question
export async function deleteQuestion(questionId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { chapter_id: true }
    });

    if (!question) {
        throw new Error("Question not found");
    }

    await prisma.question.delete({
        where: { id: questionId }
    });

    const chapterId = question.chapter_id.toString();
    revalidatePath(`/admin/chapters/${chapterId}/questions`);
}

// Server action to delete multiple questions
export async function deleteMultipleQuestions(questionIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    if (questionIds.length === 0) return;

    // Get chapter_id for revalidation
    const firstQuestion = await prisma.question.findUnique({
        where: { id: questionIds[0] },
        select: { chapter_id: true }
    });

    await prisma.question.deleteMany({
        where: {
            id: { in: questionIds }
        }
    });

    if (firstQuestion) {
        const chapterId = firstQuestion.chapter_id.toString();
        revalidatePath(`/admin/chapters/${chapterId}/questions`);
    }
}

// Server action to get question count stats
export async function getQuestionStats(chapterId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const bigChapterId = BigInt(chapterId);

    const [total, byDifficulty, byType] = await Promise.all([
        prisma.question.count({
            where: { chapter_id: bigChapterId }
        }),
        prisma.question.groupBy({
            by: ['difficulty'],
            where: { chapter_id: bigChapterId },
            _count: true
        }),
        prisma.question.groupBy({
            by: ['question_type'],
            where: { chapter_id: bigChapterId },
            _count: true
        })
    ]);

    return {
        total,
        byDifficulty: byDifficulty.reduce((acc, item) => {
            acc[item.difficulty] = item._count;
            return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
            acc[item.question_type] = item._count;
            return acc;
        }, {} as Record<string, number>)
    };
}
