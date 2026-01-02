import { getSettingString } from "@/lib/app-settings";

/**
 * AI Models for Textbook Generation
 * Using dynamic settings with defaults
 */
export async function getTextbookModels() {
    return {
        // Primary model for high-quality content generation (BEST AVAILABLE)
        CONTENT_PRIMARY: await getSettingString('ai.model.textbook.content', 'gemini-3-pro-preview'),

        // Fallback if primary fails
        CONTENT_FALLBACK: await getSettingString('ai.model.textbook.fallback', 'gemini-2.5-pro'),

        // For structured parsing (JSON extraction) - Flash is sufficient
        PARSER: await getSettingString("ai.model.textbook.parser", "gemini-3-flash-preview"),

        // For image generation - Nano Banana Pro (Gemini 3 Pro Image Preview)
        IMAGE: await getSettingString('ai.model.textbook.image', 'gemini-3-pro-image-preview'),
    };
}

/**
 * @deprecated Use getTextbookModels() instead for dynamic settings
 */
export const TEXTBOOK_AI_MODELS = {
    CONTENT_PRIMARY: 'gemini-3-pro-preview',
    CONTENT_FALLBACK: 'gemini-2.5-pro',
    PARSER: 'gemini-2.0-flash',
    IMAGE: 'gemini-3-pro-image-preview',
} as const;

/**
 * Gemini 3 Pro specific configuration
 * Based on Google's documentation for optimal results
 */
export const GEMINI_3_CONFIG = {
    // Use high thinking level for complex educational content
    thinkingLevel: 'high' as const,  // 'low' | 'high'

    // Temperature: Google recommends 1.0 (default) for Gemini 3
    // Lower values may cause looping issues
    temperature: 1.0,

    // For PDF/document processing
    mediaResolution: 'high' as const,
} as const;

/**
 * Model capabilities and token limits
 */
export const MODEL_LIMITS = {
    // Gemini 3 Series
    'gemini-3-pro-preview': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 65_536,
        thinkingEnabled: true,
    },
    'gemini-3-flash-preview': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 65_536,
        thinkingEnabled: true, // Support for agentic/structured reasoning
    },
    'gemini-3-pro-image-preview': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 8_192,
    },

    // Gemini 2.5 Series
    'gemini-2.5-pro': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 65_536,
        costPerMillionInput: 1.25,
        costPerMillionOutput: 10.00,
    },
    'gemini-2.5-flash': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 65_536,
        costPerMillionInput: 0.10,
        costPerMillionOutput: 0.40,
    },
    'gemini-2.5-flash-lite': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 32_768,
        costPerMillionInput: 0.05,
        costPerMillionOutput: 0.20,
    },

    // Gemini 2.0 Series
    'gemini-2.0-flash': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 8_192,
        costPerMillionInput: 0.10,
        costPerMillionOutput: 0.40,
    },
    'gemini-2.0-flash-exp': {
        maxInputTokens: 1_000_000,
        maxOutputTokens: 8_192,
    },
} as const;

/**
 * Default generation options
 */
export const DEFAULT_GENERATION_OPTIONS = {
    chapter: {
        includeExamHighlights: true,
        examTypes: ['NEET', 'JEE', 'CUET'] as const,
        difficulty: 'intermediate' as const,
        thinkingLevel: 'high' as const,
    },
    questions: {
        mcqCount: 5,
        shortAnswerCount: 3,
        longAnswerCount: 1,
        includeCUETStyle: true,
    },
} as const;

export type ThinkingLevel = 'low' | 'high';
export type ModelName = keyof typeof MODEL_LIMITS;
