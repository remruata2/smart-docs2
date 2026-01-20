/**
 * Syllabus Splitter Service
 * 
 * For competitive exams (UPSC/MPSC/SSC), splits broad topics into separate syllabi
 * and expands each with AI-generated chapters and subtopics.
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getProviderApiKey } from '@/lib/ai-key-store';
import { getTextbookModels } from './models';
import { prisma } from '@/lib/prisma';
import type { ExamCategory } from './exam-prompts';
import { EXAM_CATEGORY_LABELS } from './exam-prompts';

// Schema for AI-generated chapters and subtopics
const ExpandedChapterSchema = z.object({
    title: z.string().describe('Chapter title, e.g., "Ancient India"'),
    subtopics: z.array(z.string()).describe('List of subtopics to cover in this chapter'),
});

const ExpandedTopicSchema = z.object({
    chapters: z.array(ExpandedChapterSchema).describe('Chapters for this topic'),
});

interface SplitResult {
    success: boolean;
    syllabi?: Array<{
        id: number;
        title: string;
        chaptersCount: number;
    }>;
    error?: string;
}

/**
 * Expand a broad topic into detailed chapters and subtopics
 * using AI based on the exam category
 */
async function expandTopicWithAI(
    topicTitle: string,
    examCategory: ExamCategory,
    stateContext?: string
): Promise<{ success: true; chapters: Array<{ title: string; subtopics: string[] }> } | { success: false; error: string }> {
    try {
        const { apiKey } = await getProviderApiKey({ provider: 'gemini' });
        const keyToUse = apiKey || process.env.GEMINI_API_KEY;

        if (!keyToUse) {
            return { success: false, error: 'No Gemini API key configured' };
        }

        const google = createGoogleGenerativeAI({ apiKey: keyToUse });
        const examLabel = EXAM_CATEGORY_LABELS[examCategory] || examCategory;

        const stateHint = stateContext
            ? `\n- Include state-specific content for ${stateContext} where relevant (e.g., local history, geography, current affairs)`
            : '';

        const prompt = `You are an expert in ${examLabel} exam preparation and syllabus design.

TASK: Expand the following broad syllabus topic into detailed chapters and subtopics suitable for ${examLabel} preparation.

TOPIC: "${topicTitle}"

RULES:
1. Generate 4-8 chapters that comprehensively cover this topic
2. For each chapter, generate 5-10 specific subtopics
3. Focus on content that is frequently asked in ${examLabel} exams
4. Structure should follow typical exam prep book patterns
5. Be specific - avoid vague or overly broad subtopics${stateHint}

EXAMPLES:
- If topic is "History of India", chapters could be: "Ancient India", "Medieval India", "Modern India", "Indian National Movement", "Post-Independence India"
- If topic is "Indian Polity", chapters could be: "Constitutional Framework", "Fundamental Rights", "Parliament", "Judiciary", "State Government", "Local Government"
- If topic is "Geography", chapters could be: "Physical Geography of India", "Climate", "Rivers and Drainage", "Agriculture", "Industries", "Population"

OUTPUT: Generate a structured JSON with chapters and their subtopics.`;

        const { PARSER } = await getTextbookModels();
        const result = await generateObject({
            model: google(PARSER),
            schema: ExpandedTopicSchema,
            prompt: prompt,
            // @ts-expect-error - timeout is supported by AI SDK v5 but not in type definitions yet
            timeout: 300000, // 5 minutes for complex topic expansion
        });

        const expanded = result.object;

        if (!expanded.chapters || expanded.chapters.length === 0) {
            return { success: false, error: 'AI could not generate chapters for this topic' };
        }

        console.log(`[SYLLABUS-SPLITTER] Expanded "${topicTitle}" into ${expanded.chapters.length} chapters`);

        return {
            success: true,
            chapters: expanded.chapters,
        };

    } catch (error) {
        console.error('[SYLLABUS-SPLITTER] Error expanding topic:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to expand topic',
        };
    }
}

/**
 * Split a parent syllabus into multiple child syllabi and expand each
 */
export async function splitAndExpandSyllabus(
    parentSyllabusId: number,
    options?: {
        stateContext?: string; // e.g., "Mizoram" for state-specific content
    }
): Promise<SplitResult> {
    try {
        // Fetch parent syllabus with its parsed structure
        const parentSyllabus = await prisma.syllabus.findUnique({
            where: { id: parentSyllabusId },
            include: {
                units: {
                    include: {
                        chapters: true,
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!parentSyllabus) {
            return { success: false, error: 'Parent syllabus not found' };
        }

        const examCategory = (parentSyllabus.exam_category || 'government_prelims') as ExamCategory;
        const createdSyllabi: Array<{ id: number; title: string; chaptersCount: number }> = [];
        const errors: string[] = [];

        // Get all chapters from the parent (these are the broad topics to split)
        const broadTopics: Array<{ title: string; originalChapterId: number }> = [];
        for (const unit of parentSyllabus.units) {
            for (const chapter of unit.chapters) {
                broadTopics.push({
                    title: chapter.title,
                    originalChapterId: chapter.id,
                });
            }
        }

        if (broadTopics.length === 0) {
            return { success: false, error: 'No topics found to split. Please parse the syllabus first.' };
        }

        console.log(`[SYLLABUS-SPLITTER] Splitting ${broadTopics.length} topics from syllabus ${parentSyllabusId}`);

        // Create a child syllabus for each broad topic
        for (const topic of broadTopics) {
            try {
                // Expand the topic with AI
                const expandResult = await expandTopicWithAI(
                    topic.title,
                    examCategory,
                    options?.stateContext
                );

                if (!expandResult.success) {
                    errors.push(`Failed to expand "${topic.title}": ${expandResult.error}`);
                    continue;
                }

                // Create new syllabus for this topic
                const childSyllabus = await prisma.$transaction(async (tx) => {
                    // Create the syllabus
                    const syllabus = await tx.syllabus.create({
                        data: {
                            title: `${parentSyllabus.subject} - ${topic.title}`,
                            description: `Split from parent syllabus: ${parentSyllabus.title}`,
                            board: parentSyllabus.board,
                            class_level: parentSyllabus.class_level,
                            stream: parentSyllabus.stream,
                            subject: topic.title, // The topic becomes the subject
                            academic_year: parentSyllabus.academic_year,
                            exam_category: examCategory,
                            syllabus_mode: 'single', // Child syllabi are single-mode
                            parent_syllabus_id: parentSyllabusId,
                            status: 'PARSED',
                        },
                    });

                    // Create a single unit for the expanded content
                    const unit = await tx.syllabusUnit.create({
                        data: {
                            syllabus_id: syllabus.id,
                            title: topic.title,
                            order: 1,
                            description: `Expanded content for ${topic.title}`,
                        },
                    });

                    // Create chapters from AI expansion
                    await tx.syllabusChapter.createMany({
                        data: expandResult.chapters.map((ch, idx) => ({
                            unit_id: unit.id,
                            chapter_number: (idx + 1).toString(),
                            title: ch.title,
                            order: idx + 1,
                            subtopics: ch.subtopics, // Prisma handles JSON serialization
                        })),
                    });

                    return {
                        id: syllabus.id,
                        title: syllabus.title,
                        chaptersCount: expandResult.chapters.length,
                    };
                });

                createdSyllabi.push(childSyllabus);
                console.log(`[SYLLABUS-SPLITTER] Created child syllabus: ${childSyllabus.title} (${childSyllabus.chaptersCount} chapters)`);

            } catch (topicError) {
                const errorMsg = topicError instanceof Error ? topicError.message : 'Unknown error';
                errors.push(`Error processing "${topic.title}": ${errorMsg}`);
                console.error(`[SYLLABUS-SPLITTER] Error processing topic "${topic.title}":`, topicError);
            }
        }

        // Update parent syllabus mode
        await prisma.syllabus.update({
            where: { id: parentSyllabusId },
            data: { syllabus_mode: 'multi_split' },
        });

        if (createdSyllabi.length === 0) {
            return {
                success: false,
                error: `Failed to create any syllabi. Errors: ${errors.join('; ')}`,
            };
        }

        return {
            success: true,
            syllabi: createdSyllabi,
        };

    } catch (error) {
        console.error('[SYLLABUS-SPLITTER] Error splitting syllabus:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to split syllabus',
        };
    }
}

/**
 * Get all child syllabi of a parent
 */
export async function getChildSyllabi(parentSyllabusId: number) {
    return prisma.syllabus.findMany({
        where: { parent_syllabus_id: parentSyllabusId },
        include: {
            units: {
                include: {
                    chapters: true,
                },
            },
        },
        orderBy: { created_at: 'asc' },
    });
}

/**
 * Check if a syllabus is eligible for splitting
 * (must be competitive exam category and have parsed content)
 */
export function isEligibleForSplit(examCategory: string | null | undefined): boolean {
    const competitiveCategories = [
        'government_prelims',
        'government_mains',
        'banking',
    ];
    return competitiveCategories.includes(examCategory || '');
}
