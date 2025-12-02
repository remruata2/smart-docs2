import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { questions, chapterId } = await req.json();

        if (!questions || !Array.isArray(questions) || !chapterId) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        console.log(`[BULK-CREATE] Saving ${questions.length} questions for chapter ${chapterId}...`);

        // Map frontend types to Prisma enum types
        const mapQuestionType = (type: string) => {
            switch (type) {
                case "MCQ": return "MCQ";
                case "SHORT_ANSWER": return "SHORT_ANSWER";
                case "LONG_ANSWER": return "LONG_ANSWER";
                case "TRUE_FALSE": return "TRUE_FALSE";
                case "FILL_IN_THE_BLANK": return "FILL_IN_BLANK"; // Note the difference
                default: return "MCQ";
            }
        };

        // Create questions in transaction
        const result = await prisma.$transaction(
            questions.map((q: any) =>
                prisma.question.create({
                    data: {
                        chapter_id: parseInt(chapterId),
                        question_text: q.question_text,
                        question_type: mapQuestionType(q.question_type),
                        points: q.points || 1,
                        options: q.options || [],
                        correct_answer: q.correct_answer,
                        explanation: q.explanation,
                        difficulty: "exam", // Exam paper questions - included regardless of difficulty filter
                        is_active: true
                    }
                })
            )
        );

        return NextResponse.json({
            success: true,
            count: result.length
        });

    } catch (error: any) {
        console.error("[BULK-CREATE] Error saving questions:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save questions" },
            { status: 500 }
        );
    }
}
