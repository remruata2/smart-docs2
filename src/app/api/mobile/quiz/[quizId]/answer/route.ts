
import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { quizService } from "@/lib/quiz-service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const user = await getMobileUser(request);
        const { quizId } = await params;
        const body = await request.json();
        const { answers } = body;

        if (!answers) {
            return NextResponse.json({ error: "Answers are required" }, { status: 400 });
        }

        const result = await quizService.submitQuiz(
            Number(user.id),
            quizId,
            answers
        );

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[MOBILE QUIZ SUBMIT] Error:", error);
        if (error.message === "Missing Bearer token" || error.message === "Invalid token") {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
