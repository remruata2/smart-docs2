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
    try {
        const { apiKey } = await getProviderApiKey({ provider: 'gemini' });
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;

        if (!keyToUse) {
            return { success: false, error: 'No API key configured' };
        }

        // Enhance prompt based on image type
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

        // Use Nano Banana Pro (Gemini 3 Pro Image)
        const { IMAGE } = await getTextbookModels();
        const modelName = IMAGE;
        console.log(`[IMAGE-GEN] Generating with model: ${modelName}`);

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
            console.error('[IMAGE-GEN] Gemini API error:', response.status, response.statusText, errorText);
            return { success: false, error: `Image generation failed: ${response.status} ${errorText}` };
        }

        const data = await response.json();

        // Parse Gemini 3 Pro Image Response (Candidate -> Content -> Parts -> InlineData)
        // Note: The response format for images is typically base64 in inlineData
        const candidate = data.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        // Handle image data
        if (part?.inlineData?.data) {
            return {
                success: true,
                imageBase64: part.inlineData.data,
                mimeType: part.inlineData.mimeType || 'image/png',
            };
        } else if (part?.executableCode) {
            return { success: false, error: 'Model returned executable code instead of image.' };
        }

        console.error('[IMAGE-GEN] Unexpected response format:', JSON.stringify(data).substring(0, 200));
        return { success: false, error: 'No image data found in response' };

    } catch (error) {
        console.error('[IMAGE-GEN] Error generating image:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate image',
        };
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
 * Generate all pending images for a chapter
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

    for (const image of images) {
        const result = await generateChapterImage(image.id);
        if (result.success) {
            results.success++;
        } else {
            results.failed++;
        }
    }

    return results;
}
