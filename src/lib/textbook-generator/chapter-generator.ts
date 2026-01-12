/**
 * Chapter Content Generator Service
 * Uses Gemini 3 Pro for high-quality educational content generation
 * Generates each chapter separately to prevent hallucinations
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getProviderApiKey, recordKeyUsage } from '@/lib/ai-key-store';
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
        exam_type: z.string().describe('Exam type (e.g., UPSC Prelims, JEE Main, NEET, MPSC, Banking)'),
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
        // Fetch chapter with context (including syllabus for exam_category)
        const chapter = await prisma.textbookChapter.findUnique({
            where: { id: chapterId },
            include: {
                unit: {
                    include: {
                        textbook: {
                            include: {
                                syllabus: {
                                    select: { exam_category: true }
                                }
                            }
                        },
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

        // API Key fetching moved to generation loop for rotation handling

        // Build context
        const unit = chapter.unit;
        const textbook = unit.textbook;
        const chapterIndex = unit.chapters.findIndex(c => c.id === chapter.id);
        const previousChapter = chapterIndex > 0 ? unit.chapters[chapterIndex - 1] : null;
        const nextChapter = chapterIndex < unit.chapters.length - 1 ? unit.chapters[chapterIndex + 1] : null;

        // Build subtopics list
        // Build subtopics list - Robust handling for Json type and nested stringified JSON
        let subtopics: string[] = [];

        const parseSubtopicItem = (item: any): string[] => {
            if (typeof item === 'string') {
                const trimmed = item.trim();
                // Check for stringified JSON array: starts with [ and ends with ]
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) {
                            return parsed.flatMap(p => parseSubtopicItem(p));
                        }
                    } catch (e) {
                        // Not valid JSON, continue to treat as string
                    }
                }
                // Check for double-stringified JSON (e.g. '"[...] "')
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    try {
                        const parsed = JSON.parse(trimmed); // Unquotes the string
                        return parseSubtopicItem(parsed);
                    } catch (e) {
                        // ignore
                    }
                }
                return [String(item)];
            }
            return [String(item)];
        };

        if (Array.isArray(chapter.subtopics)) {
            subtopics = chapter.subtopics.flatMap(s => parseSubtopicItem(s));
        } else if (typeof chapter.subtopics === 'string') {
            subtopics = parseSubtopicItem(chapter.subtopics);
        } else {
            // Fallback for unexpected types
            subtopics = [String(chapter.subtopics)];
        }

        const subtopicsText = subtopics.length > 0
            ? `\n\nKEY SUBTOPICS TO COVER:\n${subtopics.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
            : '';

        console.log(`[CHAPTER-GEN] Subtopics found: ${subtopics.length}`, subtopics);

        // Build exam highlights section
        // Import exam-specific prompt modules
        const { getExamInstructions, EXAM_CATEGORY_LABELS } = await import('./exam-prompts');
        type ExamCategoryType = keyof typeof EXAM_CATEGORY_LABELS;

        // Use syllabus exam_category, or options override, or default to 'academic_board'
        const syllabusExamCategory = textbook.syllabus?.exam_category as ExamCategoryType | undefined;
        const examCategory: ExamCategoryType = syllabusExamCategory || options.examCategory || 'academic_board';
        const examCategoryLabel = EXAM_CATEGORY_LABELS[examCategory];
        const examTypes = options.examTypes || [];

        console.log(`[CHAPTER-GEN] Using exam category: ${examCategoryLabel} (from ${syllabusExamCategory ? 'syllabus' : options.examCategory ? 'options' : 'default'})`);

        // Get exam-specific instructions
        // Get exam-specific instructions
        // CRITICAL FIX: Only include full exam instructions for "Academic" and "Case Study" styles.
        // For "Q&A", "Summary", and "Quick Reference", the detailed exam instructions (which often demand 
        // narrative depth, specific interlinkages, and paragraph structures) CONFLICT with the strict formatting 
        // rules of those styles. 
        // We still pass the Exam Label in the context, but we suppress the detailed structural prompt.

        const stylesNeedingFullExamPrompt: ContentStyleType[] = ['academic', 'case_study'];
        // Use textbook content_style or default to 'academic'
        const contentStyle = (textbook.content_style as ContentStyleType) || 'academic';

        let examInstructions = '';

        if (stylesNeedingFullExamPrompt.includes(contentStyle)) {
            examInstructions = getExamInstructions(examCategory, examTypes);
        } else {
            console.log(`[CHAPTER-GEN] Suppressing detailed exam prompt for style: ${contentStyle} to prevent format conflict.`);
            // Minimal context so they still know it's for UPSC/JEE, but without the structural demands
            examInstructions = `TARGET EXAM: ${examCategoryLabel}\n(Keep content relevant to this exam, but STRICTLY follow the ${contentStyle} format defined below.)`;
        }

        const examSection = options.includeExamHighlights
            ? `\n\nEXAM CONTEXT:
TARGET EXAM CATEGORY: ${examCategoryLabel}${examTypes.length > 0 ? `\nSPECIFIC EXAMS: ${examTypes.join(', ')}` : ''}
${stylesNeedingFullExamPrompt.includes(contentStyle) ? `- Mark important formulas and concepts likely to appear in exams\n- Include "Exam Tips" boxes with frequently asked question types\n- Highlight previous year question patterns` : ''}`
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

        // CRITICAL FIX: Subject instructions (Rule of 3 examples, Virtual Labs, etc.) are designed for Academic style.
        // For non-academic styles, they conflict with the format (e.g., Q&A wants only questions, Summary wants brevity).
        // We only include them for styles that need deep explanations.
        let subjectInstructions = '';
        if (stylesNeedingFullExamPrompt.includes(contentStyle)) {
            subjectInstructions = getSubjectInstructions(textbook.subject_name || 'general', textbook.class_level || 'General', examCategory);
        } else {
            console.log(`[CHAPTER-GEN] Suppressing subject instructions for style: ${contentStyle} to prevent format conflict.`);
            subjectInstructions = `SUBJECT: ${textbook.subject_name || 'General'}\n(Keep content relevant to this subject, but STRICTLY follow the ${contentStyle} format. DO NOT add long explanations or examples unless asked in a question.)`;
        }

        // Import content style prompts
        const { getStyleCorePrompt, getStyleUniversalInstructions, getStyleInstructions, CONTENT_STYLE_LABELS, STYLE_CONFIG } = await import('./content-styles');
        type ContentStyleType = keyof typeof CONTENT_STYLE_LABELS;

        // Use textbook content_style or default to 'academic'
        // const contentStyle = (textbook.content_style as ContentStyleType) || 'academic'; // Already declared above
        const contentStyleLabel = CONTENT_STYLE_LABELS[contentStyle] || 'Academic Textbook';
        const styleConfig = STYLE_CONFIG[contentStyle];

        console.log(`[CHAPTER-GEN] Using content style: ${contentStyleLabel} (${styleConfig.minWords}-${styleConfig.maxWords} words, ${styleConfig.mcqCount} MCQs)`);

        // Build prompt context for style-specific core prompt
        const promptContext = {
            subjectName: textbook.subject_name || 'General',
            classLevel: textbook.class_level || 'General',
            textbookTitle: textbook.title,
            unitTitle: unit.title,
            chapterNumber: chapter.chapter_number,
            chapterTitle: chapter.title,
            examCategoryLabel: examCategoryLabel,
            subtopicsText: subtopicsText,
            examSection: examSection,
            contextSection: contextSection,
            customSection: customSection,
        };

        // Get style-specific core prompt (replaces hardcoded academic prompt)
        const styleCorePompt = getStyleCorePrompt(contentStyle, promptContext);

        // Get style-specific instructions (additional formatting rules)
        const styleInstructions = getStyleInstructions(contentStyle);

        // Get style-specific universal instructions
        // CRITICAL FIX: For non-academic styles, we MUST use the style-specific universal instructions.
        // The default getUniversalInstructions() contains textbook-oriented rules like "2-3 paragraphs per concept"
        // and "8000-12000 words" which completely override the format of Q&A, Summary, etc.
        const styleUniversalInstructions = getStyleUniversalInstructions(contentStyle);
        let universalInstructions = '';
        if (stylesNeedingFullExamPrompt.includes(contentStyle)) {
            // For academic/case_study, use the detailed universal instructions
            universalInstructions = styleUniversalInstructions || getUniversalInstructions();
        } else {
            // For Q&A, Summary, Quick Reference: ONLY use the style-specific universal instructions
            // If none exist, use a minimal fallback that doesn't mandate narrative depth
            universalInstructions = styleUniversalInstructions || `\n*** UNIVERSAL INSTRUCTIONS ***\n- Follow the ${contentStyleLabel} format strictly.\n- Do NOT add extra explanations beyond what is required by the format.\n`;
        }

        const prompt = `${styleCorePompt}

---------------------------------------------------
${subjectInstructions}
---------------------------------------------------

---------------------------------------------------
${examInstructions}
---------------------------------------------------

---------------------------------------------------
${styleInstructions}
---------------------------------------------------

${universalInstructions}

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "summary": "2-3 paragraphs of chapter summary",
  "markdown_content": "Content formatted according to the ${contentStyleLabel} style. Use [IMAGE: description] tags for visuals. DO NOT include the exercises here (they will be appended automatically).",
  "images_to_generate": [
    { "description": "Detailed image prompt", "type": "DIAGRAM|CHART|MAP|TIMELINE|COMPARISON|INFOGRAPHIC", "placement": "must_match_IMAGE_tag_in_content", "caption": "Caption text" }
  ], // Generate EXACTLY ${styleConfig.imageCount} images
  "mcqs": [...], // Generate EXACTLY ${styleConfig.mcqCount} MCQs
  "short_answers": [...], // Generate EXACTLY ${styleConfig.shortAnswerCount} short answer questions  
  "long_answers": [...], // Generate EXACTLY ${styleConfig.longAnswerCount} long answer questions
  "key_concepts": ["concept1", "concept2"],
  "exam_highlights": [...]
}

🚨 QUANTITY LIMITS (MANDATORY):
- **Images**: EXACTLY ${styleConfig.imageCount} images (not more)
- **MCQs**: EXACTLY ${styleConfig.mcqCount} questions
- **Short Answers**: EXACTLY ${styleConfig.shortAnswerCount} questions
- **Long Answers**: EXACTLY ${styleConfig.longAnswerCount} questions

IMPORTANT: The 'placement' field in 'images_to_generate' MUST MATCH EXACTLY the text inside the [IMAGE: ...] tag in the markdown_content. Your code relies on this exact match to inject the images.
`;

        console.log(`[CHAPTER-GEN] Generating content for: ${chapter.title}`);

        // Use the content model (Gemini 3 Pro for quality)
        const { CONTENT_PRIMARY } = await getTextbookModels();
        const modelName = await getSettingString('ai.model.textbook.content_override', process.env.TEXTBOOK_GEN_CONTENT_MODEL || CONTENT_PRIMARY);

        let result: any;
        let attempts = 0;
        const maxAttempts = 4; // Try up to 4 different keys
        const usedKeyIds: number[] = [];

        while (true) {
            attempts++;

            // Get API key with exclusion for failed keys
            const { apiKey, keyId, keyLabel } = await getProviderApiKey({ provider: 'gemini', excludeKeyIds: usedKeyIds });
            const keyToUse = apiKey || process.env.GEMINI_API_KEY;
            const currentLabel = keyLabel || (apiKey ? "Unknown DB Key" : "ENV Variable");

            if (!keyToUse) {
                // If we ran out of keys and this isn't the first attempt, we should throw the last error
                // But for now, just break and throw a generic error if no keys at all
                throw new Error("No Gemini API keys available/configured");
            }

            const google = createGoogleGenerativeAI({ apiKey: keyToUse });

            try {
                console.log(`[CHAPTER - GEN] Attempt ${attempts}/${maxAttempts} using Key: "${currentLabel}" (ID: ${keyId || 'ENV'})`);

                result = await generateObject({
                    model: google(modelName),
                    schema: ChapterContentSchema,
                    prompt: prompt,
                });

                // Success - Record usage
                if (keyId) await recordKeyUsage(keyId, true);
                break; // Exit loop

            } catch (error: any) {
                // Record failure
                if (keyId) await recordKeyUsage(keyId, false);

                const errorMsg = error.message || String(error);
                const isRateLimit = errorMsg.includes('429') || error.status === 429 || errorMsg.toLowerCase().includes('rate limit');

                if (isRateLimit && attempts < maxAttempts) {
                    console.warn(`[CHAPTER-GEN] Key ${keyId || 'ENV'} rate limited. Rotating...`);
                    if (keyId) usedKeyIds.push(keyId);
                    // Add small delay before retry
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }

                console.error(`[CHAPTER-GEN] Generation failed on attempt ${attempts}:`, error);
                throw error; // Non-retriable error or max attempts reached
            }
        }

        const content = result.object as GeneratedChapterContent;

        // Force-append structured assessment questions to markdown to ensure they appear in the PDF
        // This fixes the issue where the AI puts "See full list..." in markdown but hides the real questions in the JSON array
        let assessmentMarkdown = '\n\n## CHAPTER-END ASSESSMENT\n';
        let hasAssessment = false;

        if (content.mcqs && content.mcqs.length > 0) {
            hasAssessment = true;
            assessmentMarkdown += '\n### Multiple Choice Questions\n';
            assessmentMarkdown += content.mcqs.map((q, i) =>
                `${i + 1}. ${q.question}\n\n${q.options.map((opt, oi) => `    ${String.fromCharCode(65 + oi)}. ${opt}`).join('\n')}\n   > **Answer:** ${String.fromCharCode(65 + q.correctAnswer)} — ${q.explanation}`
            ).join('\n\n');
        }

        if (content.short_answers && content.short_answers.length > 0) {
            hasAssessment = true;
            assessmentMarkdown += '\n\n### Short Answer Questions\n';
            assessmentMarkdown += content.short_answers.map((q, i) =>
                `${i + 1}. **${q.question}** (${q.marks} Marks)\n   *Key Points:*\n${q.expectedPoints.map(p => `   - ${p}`).join('\n')}`
            ).join('\n\n');
        }

        if (content.long_answers && content.long_answers.length > 0) {
            hasAssessment = true;
            assessmentMarkdown += '\n\n### Long Answer Questions\n';
            assessmentMarkdown += content.long_answers.map((q, i) =>
                `${i + 1}. **${q.question}** (${q.totalMarks} Marks)\n   *Marking Scheme:*\n${q.markingScheme.map(p => `   - ${p.point} (${p.marks})`).join('\n')}`
            ).join('\n\n');
        }

        if (hasAssessment) {
            content.markdown_content += assessmentMarkdown;
        }

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
