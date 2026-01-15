
import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { quizService } from "@/lib/quiz-service";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const body = await request.json();

        const { subjectId, chapterId, difficulty, questionCount, questionTypes = ["MCQ"], useAiFallback = true } = body;

        // Validate required fields
        if (!difficulty || !questionCount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const quiz = await quizService.generateQuiz(
            Number(user.id),
            Number(subjectId),
            chapterId ? Number(chapterId) : null,
            difficulty,
            Number(questionCount),
            questionTypes,
            useAiFallback
        );

        return NextResponse.json(quiz);

    } catch (error: any) {
        console.error("[MOBILE QUIZ GEN] Error:", error);
        if (error.message === "Missing Bearer token" || error.message === "Invalid token") {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
