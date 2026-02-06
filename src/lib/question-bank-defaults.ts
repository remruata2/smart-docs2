// Shared config for question bank generation
// This file contains NO React hooks, so it can be imported by both client and server components

export type QuestionType = "MCQ" | "TRUE_FALSE" | "FILL_IN_BLANK" | "SHORT_ANSWER" | "LONG_ANSWER";

export interface QuestionBankConfigState {
    easy: Record<QuestionType, number>;
    medium: Record<QuestionType, number>;
    hard: Record<QuestionType, number>;
}

export const DEFAULT_CONFIG: QuestionBankConfigState = {
    easy: { MCQ: 15, TRUE_FALSE: 15, FILL_IN_BLANK: 15, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
    medium: { MCQ: 15, TRUE_FALSE: 15, FILL_IN_BLANK: 15, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
    hard: { MCQ: 10, TRUE_FALSE: 10, FILL_IN_BLANK: 10, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
};

/**
 * Returns the question configuration based on the exam category.
 * - Schools/Academic: Uses the balanced default (includes Essays/Short Answers).
 * - Competitive: Redistributes "Subjective" counts (Short/Long) into "Objective" counts (MCQ/Fill/TF).
 */
export function getQuestionDefaults(examCategory?: string | null, subjectName?: string): QuestionBankConfigState {
    // List of categories that should be purely objective (no essays)
    const OBJECTIVE_ONLY_CATEGORIES = [
        'government_prelims',
        'engineering',
        'medical',
        'banking',
        'aptitude'
    ];

    // If it's a school exam or general, return the balanced default
    if (!examCategory || examCategory === 'academic_board' || !OBJECTIVE_ONLY_CATEGORIES.includes(examCategory)) {
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Deep copy
    }

    // EXCEPTION: Language papers (English) in competitive exams often have essays/grammar
    if (subjectName && (subjectName.toLowerCase().includes('english') || subjectName.toLowerCase().includes('language'))) {
        return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Maintain essays for English
    }

    // For competitive exams, redistribute quotas
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    (['easy', 'medium', 'hard'] as const).forEach(difficulty => {
        const subjectiveCount = (config[difficulty].SHORT_ANSWER || 0) + (config[difficulty].LONG_ANSWER || 0);

        // Remove subjective questions
        config[difficulty].SHORT_ANSWER = 0;
        config[difficulty].LONG_ANSWER = 0;

        // Redistribute to objective types (roughly thirds)
        const extraPerType = Math.floor(subjectiveCount / 3);
        const remainder = subjectiveCount % 3;

        config[difficulty].MCQ += extraPerType + remainder; // Give remainder to MCQ
        config[difficulty].TRUE_FALSE += extraPerType;
        config[difficulty].FILL_IN_BLANK += extraPerType;
    });

    return config;
}
