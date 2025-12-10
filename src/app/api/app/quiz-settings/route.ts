import { NextResponse } from "next/server";
import { getAllQuizTimers } from "@/lib/settings";

/**
 * GET /api/app/quiz-settings
 * Returns quiz timer configuration for students
 */
export async function GET() {
    try {
        const timerLimits = await getAllQuizTimers();

        return NextResponse.json({
            success: true,
            timerLimits
        });
    } catch (error) {
        console.error("[QUIZ SETTINGS] Error fetching settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch quiz settings" },
            { status: 500 }
        );
    }
}
