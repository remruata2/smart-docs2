"use server";

import { getGeminiClient, getActiveModelNames, recordKeyUsage } from "@/lib/ai-key-store";
import { prisma } from "@/lib/prisma";

export async function translateContent(text: string, targetLanguage: string) {
    try {
        const { client, keyId } = await getGeminiClient();

        // Get active models or fallback
        const dbModels = await getActiveModelNames("gemini");
        const modelName = dbModels[0] || process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash";

        const model = client.getGenerativeModel({ model: modelName });

        const prompt = `You are a professional translator. Translate the following educational text into ${targetLanguage}.
    
    CRITICAL INSTRUCTIONS:
    1. Maintain ALL Markdown formatting exactly as is (headers, bold, italics, lists, tables).
    2. Do not add any conversational filler (e.g., "Here is the translation", "Sure").
    3. Only output the translated text.
    4. Ensure technical terms are translated accurately but keep them in English if they are commonly used as such in the target language context (especially for Mizo/Hindi).
    5. Preserve double newlines for paragraph breaks.

    TEXT TO TRANSLATE:
    ${text}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const translatedText = response.text();

        if (keyId) {
            await recordKeyUsage(keyId, true);
        }

        return { success: true, translatedText };
    } catch (error) {
        console.error("Translation error:", error);
        return text; // Fallback to original text
    }
}
