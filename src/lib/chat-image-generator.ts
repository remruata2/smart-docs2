/**
 * Chat Image Generation Service
 * Uses Google Gemini's Nano Banana for generating
 * educational images in student chat conversations.
 * Model is configurable via admin settings.
 */

import { getProviderApiKey } from '@/lib/ai-key-store';
import { supabaseAdmin } from '@/lib/supabase';
import { getChatModels, CHAT_AI_MODELS } from '@/lib/chat-models';

// Gemini API endpoint for image generation
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type ImageType = 'DIAGRAM' | 'CHART' | 'ILLUSTRATION' | 'GRAPH' | 'PHOTO';

interface GenerateImageOptions {
    imageType?: ImageType;
    aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
}

interface ImageGenerationResult {
    success: true;
    imageUrl: string;
    alt: string;
}

interface ImageGenerationError {
    success: false;
    error: string;
}

/**
 * Generate an educational image for chat
 */
export async function generateChatImage(
    prompt: string,
    options: GenerateImageOptions = {}
): Promise<ImageGenerationResult | ImageGenerationError> {
    try {
        const { apiKey } = await getProviderApiKey({ provider: 'gemini' });
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;

        if (!keyToUse) {
            return { success: false, error: 'No API key configured for image generation' };
        }

        // Get configured model (or fallback to default)
        let imageModel: string = CHAT_AI_MODELS.IMAGE_GENERATION;
        try {
            const models = await getChatModels();
            imageModel = models.IMAGE_GENERATION;
        } catch (e) {
            console.warn('[CHAT-IMAGE] Failed to get dynamic model config, using default');
        }

        // Enhance prompt based on image type for better educational content
        const enhancedPrompt = enhancePromptForEducation(prompt, options.imageType);

        console.log(`[CHAT-IMAGE] Generating image with model: ${imageModel}`);
        console.log(`[CHAT-IMAGE] Enhanced prompt: ${enhancedPrompt.substring(0, 100)}...`);

        // Call Gemini API
        const url = `${GEMINI_API_BASE}/${imageModel}:generateContent?key=${keyToUse}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: enhancedPrompt }]
                }],
                generationConfig: {
                    responseModalities: ["IMAGE"],
                    imageConfig: {
                        aspectRatio: options.aspectRatio || '4:3',
                    }
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[CHAT-IMAGE] Gemini API error:', response.status, errorText);
            return { success: false, error: `Image generation failed: ${response.status}` };
        }

        const data = await response.json();

        // Parse response
        const candidate = data.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        if (!part?.inlineData?.data) {
            console.error('[CHAT-IMAGE] No image data in response');
            return { success: false, error: 'No image data received from API' };
        }

        const imageBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';

        // Upload to Supabase storage
        const uploadResult = await uploadChatImage(imageBase64, mimeType);

        if (!uploadResult.success) {
            return { success: false, error: uploadResult.error };
        }

        console.log(`[CHAT-IMAGE] Successfully generated and uploaded image: ${uploadResult.url}`);

        return {
            success: true,
            imageUrl: uploadResult.url,
            alt: prompt,
        };

    } catch (error) {
        console.error('[CHAT-IMAGE] Error generating image:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate image',
        };
    }
}

/**
 * Enhance prompt for educational content
 */
function enhancePromptForEducation(prompt: string, imageType?: ImageType): string {
    const baseEnhancement = 'Educational illustration for students. Clear, professional style. No text watermarks.';

    switch (imageType) {
        case 'DIAGRAM':
            return `Educational diagram: ${prompt}. ${baseEnhancement} Clean labels, white background, suitable for textbooks.`;
        case 'CHART':
            return `Professional chart/graph: ${prompt}. ${baseEnhancement} Clear data visualization with axes and labels.`;
        case 'GRAPH':
            return `Mathematical graph: ${prompt}. ${baseEnhancement} Accurate plotting, coordinate system when applicable.`;
        case 'ILLUSTRATION':
            return `Educational illustration: ${prompt}. ${baseEnhancement} Colorful but appropriate for academic context.`;
        case 'PHOTO':
            return `High-quality educational photograph: ${prompt}. Realistic, well-lit, informative.`;
        default:
            return `${prompt}. ${baseEnhancement}`;
    }
}

/**
 * Upload image to Supabase storage
 */
async function uploadChatImage(
    imageBase64: string,
    mimeType: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: 'Supabase not configured' };
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(imageBase64, 'base64');

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const filename = `chat/${timestamp}-${randomId}.${ext}`;
        const bucketName = 'chat_images';

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.find(b => b.name === bucketName)) {
            await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 5242880, // 5MB
            });
        }

        // Upload
        const { error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filename, buffer, {
                contentType: mimeType,
                upsert: false,
            });

        if (error) {
            console.error('[CHAT-IMAGE] Upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filename);

        return { success: true, url: urlData.publicUrl };

    } catch (error) {
        console.error('[CHAT-IMAGE] Upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload image',
        };
    }
}

/**
 * Detect if a message requests image generation
 * Returns the image prompt if detected, null otherwise
 */
export function detectImageGenerationRequest(text: string): string | null {
    // Pattern: [GENERATE_IMAGE: description]
    const match = text.match(/\[GENERATE_IMAGE:\s*(.+?)\]/i);
    return match ? match[1].trim() : null;
}

/**
 * Parse image type from prompt context
 */
export function inferImageType(prompt: string): ImageType {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('diagram') || lowerPrompt.includes('structure')) {
        return 'DIAGRAM';
    }
    if (lowerPrompt.includes('chart') || lowerPrompt.includes('pie') || lowerPrompt.includes('bar')) {
        return 'CHART';
    }
    if (lowerPrompt.includes('graph') || lowerPrompt.includes('plot') || lowerPrompt.includes('function')) {
        return 'GRAPH';
    }
    if (lowerPrompt.includes('photo') || lowerPrompt.includes('photograph') || lowerPrompt.includes('picture of')) {
        return 'PHOTO';
    }

    return 'ILLUSTRATION';
}
