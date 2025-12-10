import { NextResponse } from "next/server";
import { quizCache } from "@/lib/quiz-cache";

export async function POST() {
    try {
        quizCache.clear();
        console.log("[CACHE] Quiz cache cleared");

        return NextResponse.json({
            success: true,
            message: "Quiz cache cleared successfully"
        });
    } catch (error) {
        console.error("[CACHE] Error clearing cache:", error);
        return NextResponse.json(
            { error: "Failed to clear cache" },
            { status: 500 }
        );
    }
}
