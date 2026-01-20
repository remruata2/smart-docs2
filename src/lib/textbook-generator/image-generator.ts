/**
 * Image Generation Service for Textbook Generator
 * Uses Google Imagen 3 for high-quality educational diagrams and illustrations
 */

import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { getProviderApiKey } from '@/lib/ai-key-store';
import { getTextbookModels } from './models';
import type { TextbookImage, TextbookImageType } from './types';

// Imagen 3 API endpoint
const IMAGEN_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface ImagenGenerateRequest {
    prompt: string;
    numberOfImages?: number;
    aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
    personGeneration?: 'DONT_ALLOW' | 'ALLOW_ADULT';
}

interface ImagenResponse {
    predictions: {
        bytesBase64Encoded: string;
        mimeType: string;
    }[];
}

/**
 * Generate an image using Imagen 3
 */
export async function generateImage(
    prompt: string,
    options: {
        aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | '9:16';
        imageType?: TextbookImageType;
    } = {}
): Promise<{ success: true; imageBase64: string; mimeType: string } | { success: false; error: string }> {
    let attempts = 0;
    const maxAttempts = 3;
    const usedKeyIds: number[] = [];
    const logLabel = "[IMAGE-GEN]";

    // Enhance prompt based on image type (do once)
    let enhancedPrompt = prompt;
    const imageType = options.imageType || 'ILLUSTRATION';
    switch (imageType) {
        case 'DIAGRAM':
            enhancedPrompt = `Educational diagram for a textbook: ${prompt}. Clean, professional style with clear labels. White or light background, suitable for printing. No text watermarks.`;
            break;
        case 'CHART':
            enhancedPrompt = `Professional chart/graph for educational textbook: ${prompt}. Clean data visualization, clear axes and labels. Suitable for Class XI/XII students.`;
            break;
        case 'ILLUSTRATION':
            enhancedPrompt = `Educational illustration for school textbook: ${prompt}. Colorful but professional, age-appropriate for high school students. Clean style.`;
            break;
        case 'PHOTO':
            enhancedPrompt = `High-quality educational photograph: ${prompt}. Realistic, well-lit, suitable for a textbook.`;
            break;
        case 'ICON':
            enhancedPrompt = `Simple educational icon: ${prompt}. Flat design, clean lines, single color or minimal palette.`;
            break;
    }

    console.log(`${logLabel} Original prompt: "${prompt}"`);
    console.log(`${logLabel} Enhanced prompt: "${enhancedPrompt}"`);

    while (true) {
        attempts++;
        let currentKeyId: number | null = null;

        try {
            const { apiKey, keyId, keyLabel } = await getProviderApiKey({ provider: 'gemini', excludeKeyIds: usedKeyIds });
            const keyToUse = apiKey || process.env.GEMINI_API_KEY;
            const currentLabel = keyLabel || (apiKey ? "Unknown DB Key" : "ENV Variable");
            currentKeyId = keyId;

            if (!keyToUse) {
                return { success: false, error: 'No API key configured' };
            }

            // Use Nano Banana Pro (Gemini 3 Pro Image)
            const { IMAGE } = await getTextbookModels();
            const modelName = IMAGE;
            console.log(`${logLabel} Attempt ${attempts}/${maxAttempts} with model: ${modelName} (Key: "${currentLabel}" ID: ${keyId || 'ENV'})`);

            // Correct Endpoint for Gemini 3 Pro Image: :generateContent
            const url = `${IMAGEN_API_BASE}/${modelName}:generateContent?key=${keyToUse}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Payload for Nano Banana Pro
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: enhancedPrompt }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE"], // Request ONLY image
                        imageConfig: {
                            aspectRatio: options.aspectRatio || '4:3',
                        }
                    }
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Check usage recording (failure)
                if (keyId) await prisma.aiApiKey.update({
                    where: { id: keyId },
                    data: { error_count: { increment: 1 }, last_used_at: new Date() }
                }).catch(() => { });

                // Check for 429
                if (response.status === 429 || errorText.includes('429') || errorText.includes('RESOURCE_EXHAUSTED')) {
                    console.warn(`${logLabel} Rate limit 429. Rotating key...`);
                    if (keyId) usedKeyIds.push(keyId);
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue; // Retry
                    }
                }

                console.error(`${logLabel} Gemini API error:`, response.status, response.statusText, errorText);
                return { success: false, error: `Image generation failed: ${response.status} ${errorText}` };
            }

            const data = await response.json();

            // Record Success
            if (keyId) await prisma.aiApiKey.update({
                where: { id: keyId },
                data: { success_count: { increment: 1 }, last_used_at: new Date() }
            }).catch(() => { });

            // Parse Gemini 3 Pro Image Response (Candidate -> Content -> Parts -> InlineData)
            const candidate = data.candidates?.[0];
            const part = candidate?.content?.parts?.[0];

            // Handle image data
            if (part?.inlineData?.data) {
                console.log(`${logLabel} Successfully received image data (${part.inlineData.mimeType})`);
                return {
                    success: true,
                    imageBase64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'image/png',
                };
            } else if (part?.executableCode) {
                console.error(`${logLabel} Model returned executable code instead of image.`);
                return { success: false, error: 'Model returned executable code instead of image.' };
            }

            console.error(`${logLabel} Unexpected response format:`, JSON.stringify(data).substring(0, 200));
            return { success: false, error: 'No image data found in response' };

        } catch (error) {
            console.error(`${logLabel} Error generating image:`, error);
            // Record failure (network error etc)
            if (currentKeyId) await prisma.aiApiKey.update({
                where: { id: currentKeyId },
                data: { error_count: { increment: 1 }, last_used_at: new Date() }
            }).catch(() => { });

            if (attempts < maxAttempts) {
                // Try again?
                if (currentKeyId) usedKeyIds.push(currentKeyId);
                continue;
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate image',
            };
        }
    }
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToStorage(
    imageBase64: string,
    mimeType: string,
    path: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: 'Supabase not configured' };
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(imageBase64, 'base64');

        // Determine file extension
        const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const filename = `${path}.${ext}`;
        const bucketName = 'textbook_images';

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.find(b => b.name === bucketName)) {
            await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 10485760, // 10MB
            });
        }

        // Upload to textbook_images bucket
        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filename, buffer, {
                contentType: mimeType,
                upsert: true,
            });

        if (error) {
            console.error('[IMAGE-UPLOAD] Supabase error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('textbook_images')
            .getPublicUrl(filename);

        console.log(`[IMAGE-UPLOAD] Uploaded to: ${urlData.publicUrl}`);

        return { success: true, url: urlData.publicUrl };

    } catch (error) {
        console.error('[IMAGE-UPLOAD] Error uploading image:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload image',
        };
    }
}

/**
 * Generate and save an image for a chapter
 */
export async function generateChapterImage(
    imageId: number
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        // Get image record
        const image = await prisma.textbookImage.findUnique({
            where: { id: imageId },
            include: {
                chapter: {
                    include: {
                        unit: {
                            include: {
                                textbook: true,
                            },
                        },
                    },
                },
            },
        });

        if (!image) {
            return { success: false, error: 'Image record not found' };
        }

        // Update status to generating
        await prisma.textbookImage.update({
            where: { id: imageId },
            data: { status: 'GENERATING' },
        });

        // Generate the image
        const result = await generateImage(image.prompt || image.alt_text || 'Educational diagram', {
            imageType: image.type,
            aspectRatio: '4:3',
        });

        if (!result.success) {
            await prisma.textbookImage.update({
                where: { id: imageId },
                data: { status: 'FAILED' },
            });
            return { success: false, error: result.error };
        }

        // Upload to storage
        const path = `chapter-${image.chapter_id}/image-${imageId}`;
        const uploadResult = await uploadImageToStorage(
            result.imageBase64,
            result.mimeType,
            path
        );

        if (!uploadResult.success) {
            await prisma.textbookImage.update({
                where: { id: imageId },
                data: { status: 'FAILED' },
            });
            return { success: false, error: uploadResult.error };
        }

        // Update image record with URL
        await prisma.textbookImage.update({
            where: { id: imageId },
            data: {
                url: uploadResult.url,
                status: 'COMPLETED',
                generated_at: new Date(),
            },
        });

        return { success: true, url: uploadResult.url };

    } catch (error) {
        console.error('[IMAGE-GEN] Error generating chapter image:', error);

        // Update status to failed
        await prisma.textbookImage.update({
            where: { id: imageId },
            data: { status: 'FAILED' },
        }).catch(() => { });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate image',
        };
    }
}

/**
 * Generate all pending images for a chapter (in parallel batches for speed)
 */
export async function generateChapterImages(
    chapterId: number
): Promise<{ total: number; success: number; failed: number }> {
    const images = await prisma.textbookImage.findMany({
        where: {
            chapter_id: chapterId,
            status: 'PENDING',
        },
    });

    const results = { total: images.length, success: 0, failed: 0 };

    if (images.length === 0) {
        return results;
    }

    // Process images in parallel batches to avoid rate limiting
    // Concurrency limit of 3 balances speed vs API rate limits
    const BATCH_SIZE = 3;
    console.log(`[IMAGE-GEN] Generating ${images.length} images in parallel batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE);
        console.log(`[IMAGE-GEN] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(images.length / BATCH_SIZE)} (${batch.length} images)`);

        // Generate batch in parallel
        const batchResults = await Promise.allSettled(
            batch.map(image => generateChapterImage(image.id))
        );

        // Count results
        for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value.success) {
                results.success++;
            } else {
                results.failed++;
            }
        }
    }

    console.log(`[IMAGE-GEN] Completed: ${results.success} succeeded, ${results.failed} failed out of ${results.total}`);
    return results;
}
