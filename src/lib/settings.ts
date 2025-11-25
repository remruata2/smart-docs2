/**
 * Settings utility for managing system-wide configuration
 */

import { prisma } from './prisma';

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'LONG_ANSWER';

/**
 * Get a system setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key }
        });
        return setting?.value || null;
    } catch (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return null;
    }
}

/**
 * Get quiz timer limit for a specific question type (in seconds)
 */
export async function getQuizTimerForType(questionType: QuestionType): Promise<number> {
    const keyMap: Record<QuestionType, string> = {
        MCQ: 'quiz_timer_mcq',
        TRUE_FALSE: 'quiz_timer_true_false',
        FILL_IN_BLANK: 'quiz_timer_fill_blank',
        SHORT_ANSWER: 'quiz_timer_short_answer',
        LONG_ANSWER: 'quiz_timer_long_answer',
    };

    const key = keyMap[questionType];
    if (!key) {
        console.warn(`Unknown question type: ${questionType}, using default 30s`);
        return 30;
    }

    const value = await getSetting(key);
    return value ? parseInt(value, 10) : getDefaultTimerForType(questionType);
}

/**
 * Get all quiz timer settings
 */
export async function getAllQuizTimers(): Promise<Record<QuestionType, number>> {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        'quiz_timer_mcq',
                        'quiz_timer_true_false',
                        'quiz_timer_fill_blank',
                        'quiz_timer_short_answer',
                        'quiz_timer_long_answer'
                    ]
                }
            }
        });

        const timers: Record<string, number> = {};
        settings.forEach(s => {
            timers[s.key] = parseInt(s.value, 10);
        });

        return {
            MCQ: timers['quiz_timer_mcq'] || 15,
            TRUE_FALSE: timers['quiz_timer_true_false'] || 15,
            FILL_IN_BLANK: timers['quiz_timer_fill_blank'] || 15,
            SHORT_ANSWER: timers['quiz_timer_short_answer'] || 30,
            LONG_ANSWER: timers['quiz_timer_long_answer'] || 60,
        };
    } catch (error) {
        console.error('Error fetching quiz timers:', error);
        return getDefaultQuizTimers();
    }
}

/**
 * Update a system setting
 */
export async function updateSetting(key: string, value: string, type: string = 'string'): Promise<void> {
    try {
        await prisma.systemSetting.upsert({
            where: { key },
            create: { key, value, type },
            update: { value, type, updated_at: new Date() }
        });
    } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        throw new Error(`Failed to update setting: ${key}`);
    }
}

/**
 * Update quiz timer settings
 */
export async function updateQuizTimers(timers: Partial<Record<QuestionType, number>>): Promise<void> {
    const keyMap: Record<QuestionType, string> = {
        MCQ: 'quiz_timer_mcq',
        TRUE_FALSE: 'quiz_timer_true_false',
        FILL_IN_BLANK: 'quiz_timer_fill_blank',
        SHORT_ANSWER: 'quiz_timer_short_answer',
        LONG_ANSWER: 'quiz_timer_long_answer',
    };

    const updates = Object.entries(timers).map(([questionType, value]) => {
        const key = keyMap[questionType as QuestionType];
        return key ? updateSetting(key, String(value), 'number') : Promise.resolve();
    });

    await Promise.all(updates);
}

/**
 * Reset quiz timers to defaults
 */
export async function resetQuizTimersToDefaults(): Promise<void> {
    const defaults = getDefaultQuizTimers();
    await updateQuizTimers(defaults);
}

/**
 * Get default timer for a question type (fallback)
 */
function getDefaultTimerForType(questionType: QuestionType): number {
    const defaults = getDefaultQuizTimers();
    return defaults[questionType];
}

/**
 * Get default quiz timer configuration
 */
function getDefaultQuizTimers(): Record<QuestionType, number> {
    return {
        MCQ: 30,
        TRUE_FALSE: 15,
        FILL_IN_BLANK: 20,
        SHORT_ANSWER: 45,
        LONG_ANSWER: 90,
    };
}
