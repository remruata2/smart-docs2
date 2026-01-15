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
