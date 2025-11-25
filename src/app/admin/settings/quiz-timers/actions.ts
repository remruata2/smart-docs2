'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { getAllQuizTimers, updateQuizTimers, resetQuizTimersToDefaults } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export type QuizTimerSettings = {
    MCQ: number;
    TRUE_FALSE: number;
    FILL_IN_BLANK: number;
    SHORT_ANSWER: number;
    LONG_ANSWER: number;
};

/**
 * Get all quiz timer settings
 */
export async function getQuizTimerSettings(): Promise<QuizTimerSettings> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    return await getAllQuizTimers();
}

/**
 * Update quiz timer settings
 */
export async function updateQuizTimerSettings(data: QuizTimerSettings): Promise<{ success: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    // Validate values
    Object.entries(data).forEach(([key, value]) => {
        if (typeof value !== 'number' || value < 5 || value > 300) {
            throw new Error(`Invalid timer value for ${key}: must be between 5 and 300 seconds`);
        }
    });

    await updateQuizTimers(data);
    revalidatePath("/admin/settings/quiz-timers");

    return { success: true };
}

/**
 * Reset quiz timers to default values
 */
export async function resetQuizTimers(): Promise<{ success: boolean }> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    await resetQuizTimersToDefaults();
    revalidatePath("/admin/settings/quiz-timers");

    return { success: true };
}
