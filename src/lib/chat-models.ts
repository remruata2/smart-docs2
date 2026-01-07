import { getSettingString } from "@/lib/app-settings";

/**
 * AI Models for Chat & Student Features
 * Using dynamic settings with admin-configurable defaults
 */
export async function getChatModels() {
    return {
        // Primary model for chat responses
        CHAT_PRIMARY: await getSettingString('ai.model.chat.primary', 'gemini-3-flash-preview'),

        // Fallback if primary fails
        CHAT_FALLBACK: await getSettingString('ai.model.chat.fallback', 'gemini-2.5-flash'),

        // For query analysis (fast model)
        QUERY_ANALYZER: await getSettingString('ai.model.chat.analyzer', 'gemini-2.0-flash'),

        // For image generation in chat - Nano Banana (fast) or Pro (quality)
        // Default to gemini-2.5-flash-image for speed
        IMAGE_GENERATION: await getSettingString('ai.model.chat.image', 'gemini-2.5-flash-image'),
    };
}

/**
 * Static defaults for cases where async isn't available
 * @deprecated Use getChatModels() for dynamic settings
 */
export const CHAT_AI_MODELS = {
    CHAT_PRIMARY: 'gemini-3-flash-preview',
    CHAT_FALLBACK: 'gemini-2.5-flash',
    QUERY_ANALYZER: 'gemini-2.0-flash',
    IMAGE_GENERATION: 'gemini-2.5-flash-image',
} as const;

/**
 * Model options for admin settings UI
 */
export const IMAGE_MODEL_OPTIONS = [
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Nano Banana) - Fast, 1024px' },
    { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image Preview (Nano Banana Pro) - Quality, 4K' },
] as const;

export const CHAT_MODEL_OPTIONS = [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Best Quality)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
] as const;
