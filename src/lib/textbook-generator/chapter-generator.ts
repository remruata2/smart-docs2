/**
 * Chapter Content Generator Service
 * Uses Gemini 3 Pro for high-quality educational content generation
 * Generates each chapter separately to prevent hallucinations
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getProviderApiKey } from '@/lib/ai-key-store';
import { prisma } from '@/lib/prisma';
import { getTextbookModels } from './models';
import { getSettingString } from '@/lib/app-settings';
import type {
    ChapterGenerationOptions,
    GeneratedChapterContent,
    TextbookChapter,
    TextbookUnit,
    Textbook
} from './types';

// Zod schema for chapter content output
const ChapterContentSchema = z.object({
    markdown_content: z.string().describe('Full chapter content in markdown format with proper headings, examples, and explanations'),
    exam_highlights: z.array(z.object({
        exam_type: z.enum(['NEET', 'JEE', 'CUET']),
        key_points: z.array(z.string()).describe('Important points likely to appear in this exam'),
        expected_questions: z.array(z.string()).describe('Types of questions expected from this topic'),
    })).optional().describe('Exam-specific highlights'),
    key_concepts: z.array(z.string()).describe('List of key concepts covered in this chapter'),
    summary: z.string().describe('Brief summary of the chapter (2-3 paragraphs)'),
    images_to_generate: z.array(z.object({
        type: z.enum([
            'DIAGRAM',           // General conceptual diagram
            'FLOWCHART',         // Process flow, decision trees
            'CHART',             // Bar charts, pie charts, comparison charts
            'GRAPH',             // Mathematical graphs, line graphs
            'ILLUSTRATION',      // General illustrations, scenes
            'INFOGRAPHIC',       // Information graphics, summary visuals
            'MINDMAP',           // Concept maps, relationship diagrams
            'MOLECULAR',         // Chemical structures, molecular models
            'ANATOMICAL',        // Biology/human body diagrams
            'EXPERIMENTAL',      // Lab setups, experimental procedures
            'GEOMETRIC',         // Mathematical shapes, geometric proofs
            'TIMELINE',          // Historical timelines, process sequences
            'COMPARISON',        // Side-by-side comparisons, Venn diagrams
            'MAP',               // Geographic maps, distribution maps
            'PHOTO',             // Realistic photos/representations
            'ICON'               // Simple iconographic elements
        ]),
        description: z.string().describe('Detailed, specific description for AI image generation. Include colors, layout, labels, and key elements to show.'),
        placement: z.string().describe('Where in the chapter this image should appear (e.g., "After introduction to photosynthesis", "Before the practice questions")'),
        caption: z.string().optional().describe('Caption text to display below the image'),
    })).min(3).describe('Educational images/diagrams for this chapter. Generate as many as the content requires (typically 5-15 for comprehensive coverage). Let relevancy guide quantity, not arbitrary limits.'),
    mcqs: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctAnswer: z.number().min(0).max(3),
        explanation: z.string(),
        difficulty: z.enum(['easy', 'medium', 'hard']),
    })).optional().describe('Multiple choice questions for practice'),
    short_answers: z.array(z.object({
        question: z.string(),
        expectedPoints: z.array(z.string()),
        marks: z.number(),
    })).optional().describe('Short answer questions'),
    long_answers: z.array(z.object({
        question: z.string(),
        markingScheme: z.array(z.object({
            point: z.string(),
            marks: z.number(),
        })),
        totalMarks: z.number(),
    })).optional().describe('Long answer questions'),
});

interface ChapterContext {
    chapter: TextbookChapter;
    unit: TextbookUnit;
    textbook: Textbook;
    previousChapterSummary?: string;
    nextChapterTitle?: string;
}

/**
 * Generate content for a single chapter
 */
export async function generateChapterContent(
    chapterId: number,
    options: ChapterGenerationOptions,
    customPrompt?: string
): Promise<{ success: true; content: GeneratedChapterContent } | { success: false; error: string }> {
    try {
        // Fetch chapter with context
        const chapter = await prisma.textbookChapter.findUnique({
            where: { id: chapterId },
            include: {
                unit: {
                    include: {
                        textbook: true,
                        chapters: {
                            orderBy: { order: 'asc' },
                            select: { id: true, title: true, order: true, summary: true },
                        },
                    },
                },
            },
        });

        if (!chapter) {
            return { success: false, error: 'Chapter not found' };
        }

        // Get API key
        const { apiKey } = await getProviderApiKey({ provider: 'gemini' });
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;

        if (!keyToUse) {
            return { success: false, error: 'No Gemini API key configured' };
        }

        const google = createGoogleGenerativeAI({ apiKey: keyToUse });

        // Build context
        const unit = chapter.unit;
        const textbook = unit.textbook;
        const chapterIndex = unit.chapters.findIndex(c => c.id === chapter.id);
        const previousChapter = chapterIndex > 0 ? unit.chapters[chapterIndex - 1] : null;
        const nextChapter = chapterIndex < unit.chapters.length - 1 ? unit.chapters[chapterIndex + 1] : null;

        // Build subtopics list
        // Build subtopics list - Robust handling for Json type
        let subtopics: string[] = [];
        if (Array.isArray(chapter.subtopics)) {
            subtopics = chapter.subtopics.map(s => String(s)); // Ensure all items are strings
        } else if (typeof chapter.subtopics === 'string') {
            try {
                // Try to parse if it's a stringified JSON
                const parsed = JSON.parse(chapter.subtopics);
                if (Array.isArray(parsed)) {
                    subtopics = parsed.map(s => String(s));
                } else {
                    subtopics = [chapter.subtopics];
                }
            } catch (e) {
                // If not JSON, check if it's a concatenated string with multiple topics
                // Split on semicolons or periods followed by capital letters (common in syllabi)
                const singleString = chapter.subtopics;

                // Try common delimiters: semicolon, then comma, then period-space
                if (singleString.includes(';')) {
                    subtopics = singleString
                        .split(';')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                } else if (singleString.includes(',')) {
                    // Split by comma, but be careful not to split things like "Raoult's Law, modified"
                    // Usually in syllabi, commas separate distinct topics
                    subtopics = singleString
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                } else if (singleString.includes('. ')) {
                    subtopics = singleString
                        .split(/\.\s+(?=[A-Z])/)
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                } else {
                    subtopics = [singleString];
                }
            }
        }

        const subtopicsText = subtopics.length > 0
            ? `\n\nKEY SUBTOPICS TO COVER:\n${subtopics.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
            : '';

        console.log(`[CHAPTER-GEN] Subtopics found: ${subtopics.length}`, subtopics);

        // Build exam highlights section
        const examSection = options.includeExamHighlights && options.examTypes.length > 0
            ? `\n\nEXAM RELEVANCE:\nThis content should include highlights for: ${options.examTypes.join(', ')}
         - Mark important formulas and concepts likely to appear in exams
         - Include "Exam Tips" boxes with frequently asked question types
         - Highlight previous year question topics`
            : '';

        // Custom prompt from admin
        const customSection = customPrompt
            ? `\n\nADDITIONAL INSTRUCTIONS FROM ADMIN:\n${customPrompt}`
            : '';

        // Previous chapter context for continuity
        const contextSection = previousChapter?.summary
            ? `\n\nPREVIOUS CHAPTER CONTEXT (for continuity):\n${previousChapter.summary}`
            : '';

        // Import subject-specific prompt modules
        const { getSubjectInstructions, getUniversalInstructions } = await import('./subject-prompts');
        const subjectInstructions = getSubjectInstructions(textbook.subject_name || 'general', textbook.class_level || 'General');
        const universalInstructions = getUniversalInstructions();

        const prompt = `You are a World-Class Educator and Textbook Author specializing in ${textbook.subject_name} for ${textbook.class_level}.
Your goal is to create a "Super-Textbook" that covers the standard curriculum but significantly outperforms standard textbooks in clarity, depth, and exam utility.

CONTEXT:
TEXTBOOK: ${textbook.title}
UNIT: ${unit.title}
CHAPTER: ${chapter.chapter_number}. ${chapter.title}
AUDIENCE: ${textbook.class_level} students preparing for Board Exams AND Competitive Exams (NEET/JEE/CUET).
${subtopicsText}
${examSection}
${contextSection}
${customSection}

---------------------------------------------------
${subjectInstructions}
---------------------------------------------------

${universalInstructions}

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "summary": "2-3 paragraphs of chapter summary",
  "markdown_content": "Extensive technical material. Use [IMAGE: description] tags. Mandatory: End with a '## Exercises' section.",
  "images_to_generate": [
    { "description": "Highly detailed image prompt", "type": "DIAGRAM", "placement": "must_match_tag_in_content", "caption": "Optional caption" }
  ],
  "mcqs": [...],
  "short_answers": [...],
  "long_answers": [...],
  "key_concepts": ["concept1", "concept2"],
  "exam_highlights": [...]
}

IMPORTANT: The 'placement' field in 'images_to_generate' MUST MATCH EXACTLY the text inside the [IMAGE: ...] tag in the markdown_content. Your code relies on this exact match to inject the images.
`;

        console.log(`[CHAPTER-GEN] Generating content for: ${chapter.title}`);

        // Use the content model (Gemini 3 Pro for quality)
        const { CONTENT_PRIMARY } = await getTextbookModels();
        const modelName = await getSettingString('ai.model.textbook.content_override', process.env.TEXTBOOK_GEN_CONTENT_MODEL || CONTENT_PRIMARY);

        const result = await generateObject({
            model: google(modelName),
            schema: ChapterContentSchema,
            prompt: prompt,
        });

        const content = result.object as GeneratedChapterContent;

        console.log(`[CHAPTER-GEN] Successfully generated content for: ${chapter.title}`);
        console.log(`[CHAPTER-GEN] Content length: ${content.markdown_content.length} chars`);
        console.log(`[CHAPTER-GEN] Images to generate: ${content.images_to_generate.length}`);

        return { success: true, content };

    } catch (error) {
        console.error('[CHAPTER-GEN] Error generating chapter content:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate chapter content',
        };
    }
}

/**
 * Update chapter with generated content
 */
export async function saveChapterContent(
    chapterId: number,
    content: GeneratedChapterContent
): Promise<{ success: boolean; error?: string }> {
    try {
        // Import ImageGenStatus dynamically
        const { ImageGenStatus } = await import('@/generated/prisma');

        // Valid Prisma enum values
        const VALID_IMAGE_TYPES = [
            'DIAGRAM', 'FLOWCHART', 'CHART', 'GRAPH', 'ILLUSTRATION',
            'INFOGRAPHIC', 'MINDMAP', 'MOLECULAR', 'ANATOMICAL',
            'EXPERIMENTAL', 'GEOMETRIC', 'TIMELINE', 'COMPARISON',
            'MAP', 'COVER'
        ];

        await prisma.$transaction(async (tx) => {
            // 0. Clear existing generated images for this chapter to prevent duplicates on regeneration
            // First, fetch existing images to delete from storage
            const existingImages = await tx.textbookImage.findMany({
                where: { chapter_id: chapterId },
                select: { id: true, url: true }
            });

            // Delete image files from storage
            if (existingImages.length > 0) {
                const { supabaseAdmin } = await import('@/lib/supabase');
                if (supabaseAdmin) {
                    const filesToDelete = existingImages
                        .filter(img => img.url)
                        .map(img => {
                            // Extract path from URL: .../chapter-14/image-34.jpg
                            const urlParts = img.url!.split('/textbook_images/');
                            return urlParts[1]; // e.g., "chapter-14/image-34.jpg"
                        })
                        .filter(Boolean);

                    if (filesToDelete.length > 0) {
                        console.log(`[CLEANUP] Deleting ${filesToDelete.length} old image files from storage`);
                        await supabaseAdmin.storage
                            .from('textbook_images')
                            .remove(filesToDelete);
                    }
                }
            }

            // Delete database records
            await tx.textbookImage.deleteMany({
                where: { chapter_id: chapterId }
            });

            // 0.5. Process Python plot code blocks (for Mathematics)
            let markdownWithPlots = content.markdown_content;
            const pythonPlotBlocks = markdownWithPlots.match(/```python-plot\n([\s\S]*?)```/g);

            if (pythonPlotBlocks && pythonPlotBlocks.length > 0) {
                console.log(`[PLOT-GEN] Found ${pythonPlotBlocks.length} Python plot blocks`);

                const { executePythonPlot, uploadPlotToStorage } = await import('./plot-generator');

                for (let i = 0; i < pythonPlotBlocks.length; i++) {
                    const block = pythonPlotBlocks[i];
                    // Extract Python code from block
                    const codeMatch = block.match(/```python-plot\n([\s\S]*?)```/);
                    if (!codeMatch) continue;

                    const pythonCode = codeMatch[1];

                    try {
                        // Execute Python code to generate plot
                        console.log(`[PLOT-GEN] Executing plot ${i + 1}...`);
                        const result = await executePythonPlot(pythonCode);

                        if (result.success && result.imageBuffer) {
                            // Upload plot to storage
                            const uploadResult = await uploadPlotToStorage(
                                result.imageBuffer,
                                chapterId,
                                i + 1
                            );

                            if (uploadResult.success && uploadResult.url) {
                                // Create image record for plot
                                const plotPlacement = `plot_${i + 1}`;
                                await tx.textbookImage.create({
                                    data: {
                                        chapter_id: chapterId,
                                        type: 'CHART',
                                        prompt: `Mathematically precise plot (Python-generated)`,
                                        placement: plotPlacement,
                                        url: uploadResult.url,
                                        order: i + 1,
                                        status: 'COMPLETED' as any,
                                        generated_at: new Date(),
                                    }
                                });

                                // Replace code block with IMAGE tag
                                markdownWithPlots = markdownWithPlots.replace(
                                    block,
                                    `\n[IMAGE: ${plotPlacement}]\n`
                                );

                                console.log(`[PLOT-GEN] ✅ Plot ${i + 1} generated and uploaded`);
                            } else {
                                console.error(`[PLOT-GEN] Failed to upload plot ${i + 1}:`, uploadResult.error);
                            }
                        } else {
                            console.error(`[PLOT-GEN] Failed to execute plot ${i + 1}:`, result.error);
                        }
                    } catch (error) {
                        console.error(`[PLOT-GEN] Error processing plot ${i + 1}:`, error);
                    }
                }
            }

            // 1. Update Chapter Content
            await tx.textbookChapter.update({
                where: { id: chapterId },
                data: {
                    content: markdownWithPlots,
                    summary: content.summary,
                    generated_at: new Date(),
                    // Save questions if available
                    mcq_questions: (content.mcqs || []) as any,
                    short_questions: (content.short_answers || []) as any,
                    long_questions: (content.long_answers || []) as any,
                    exam_highlights: (content.exam_highlights || []) as any,
                    key_takeaways: (content.key_concepts || []) as any,
                },
            });

            // 3. Create Image Placeholders
            if (content.images_to_generate.length > 0) {
                await tx.textbookImage.createMany({
                    data: content.images_to_generate.map((img, index) => {
                        let imageType = img.type?.toUpperCase().trim() || 'DIAGRAM';

                        if (imageType === 'PHOTO' || imageType === 'PHOTOGRAPH') imageType = 'ILLUSTRATION';
                        if (imageType === 'ICON') imageType = 'ILLUSTRATION';
                        if (imageType === 'CONCEPT_MAP') imageType = 'MINDMAP';

                        const finalType = VALID_IMAGE_TYPES.includes(imageType)
                            ? imageType
                            : 'DIAGRAM';

                        return {
                            chapter_id: chapterId,
                            type: finalType as any,
                            prompt: img.description,
                            placement: img.placement,
                            caption: img.caption || null,
                            order: index + 1,
                            status: ImageGenStatus.PENDING,
                        };
                    }),
                });
            }
        });

        return { success: true };
    } catch (error) {
        console.error('[CHAPTER-GEN] Error saving chapter content:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save chapter',
        };
    }
}

/**
 * Get chapter generation progress for a textbook
 */
export async function getTextbookProgress(textbookId: number): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    failed: number;
    percentage: number;
}> {
    const chapters = await prisma.textbookChapter.findMany({
        where: {
            unit: {
                textbook_id: textbookId,
            },
        },
        select: { status: true },
    });

    const stats = {
        total: chapters.length,
        completed: chapters.filter(c => c.status === 'COMPLETED').length,
        inProgress: chapters.filter(c => c.status === 'GENERATING').length,
        pending: chapters.filter(c => c.status === 'PENDING').length,
        failed: chapters.filter(c => c.status === 'FAILED').length,
        percentage: 0,
    };

    stats.percentage = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;

    return stats;
}
