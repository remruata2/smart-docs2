import { prisma } from "@/lib/prisma";
import { generateBatchQuestions } from "@/lib/ai-service-enhanced";
import { QuestionType } from "@/generated/prisma";

export interface QuestionBankConfig {
    difficulty: "easy" | "medium" | "hard";
    typeCounts: {
        [key in QuestionType]?: number;
    };
}

export interface FullQuestionBankConfig {
    easy: { [key in QuestionType]?: number };
    medium: { [key in QuestionType]?: number };
    hard: { [key in QuestionType]?: number };
}

/**
 * Generate a comprehensive Question Bank for a chapter
 * - Fetches all chunks for the chapter
 * - Groups them into logical sections (e.g., 3-5 pages)
 * - Distributes the total question quota among sections
 * - Generates questions in parallel batches
 */
export async function generateQuestionBank(
    chapterId: string,
    config: FullQuestionBankConfig
) {
    console.log(`[QUESTION-BANK] Starting generation for chapter ${chapterId}`);

    try {
        const bigChapterId = BigInt(chapterId);

        // 1. Fetch chapter details to get exam_category and chunks
        const chapter = await prisma.chapter.findUnique({
            where: { id: bigChapterId },
            include: {
                subject: {
                    include: {
                        program: true
                    }
                },
                chunks: {
                    orderBy: { chunk_index: 'asc' },
                    select: {
                        id: true,
                        content: true,
                        page_number: true,
                        chunk_index: true
                    }
                }
            }
        });

        if (!chapter || chapter.chunks.length === 0) {
            console.warn(`[QUESTION-BANK] No chunks or chapter found for chapter ${chapterId}`);
            return;
        }

        const chunks = chapter.chunks;
        const examCategory = chapter.subject.program.exam_category as any;

        // 2. Group chunks into logical sections (e.g., ~3 pages per section)
        // This ensures thorough coverage of the entire chapter
        const PAGES_PER_SECTION = 3;
        const sections: {
            startPage: number;
            endPage: number;
            content: string;
            chunkIds: bigint[];
        }[] = [];

        let currentSectionChunks: typeof chunks = [];
        let currentStartPage = chunks[0].page_number || 1;

        for (const chunk of chunks) {
            const pageNum = chunk.page_number || 0;

            // If we have collected enough pages, close the section
            // Or if there's a large gap in page numbers (new unit?)
            if (
                currentSectionChunks.length > 0 &&
                (pageNum > currentStartPage + PAGES_PER_SECTION || pageNum > (currentSectionChunks[currentSectionChunks.length - 1].page_number || 0) + 2)
            ) {
                sections.push({
                    startPage: currentStartPage,
                    endPage: currentSectionChunks[currentSectionChunks.length - 1].page_number || currentStartPage,
                    content: currentSectionChunks.map(c => c.content).join("\n\n"),
                    chunkIds: currentSectionChunks.map(c => c.id)
                });
                currentSectionChunks = [];
                currentStartPage = pageNum;
            }
            currentSectionChunks.push(chunk);
        }

        // Add the last section
        if (currentSectionChunks.length > 0) {
            sections.push({
                startPage: currentStartPage,
                endPage: currentSectionChunks[currentSectionChunks.length - 1].page_number || currentStartPage,
                content: currentSectionChunks.map(c => c.content).join("\n\n"),
                chunkIds: currentSectionChunks.map(c => c.id)
            });
        }

        console.log(`[QUESTION-BANK] Split chapter into ${sections.length} sections for processing`);

        // 3. Calculate quota per section
        // We need to distribute the total requested questions among the sections
        // We'll do this proportionally, but for now, simple division is fine
        // If 6 sections and 20 Easy MCQs requested -> ~3-4 per section

        const totalSections = sections.length;

        // Helper to distribute count
        const distribute = (total: number) => {
            const base = Math.floor(total / totalSections);
            const remainder = total % totalSections;
            return { base, remainder };
        };

        // Prepare jobs for each section
        const jobs = sections.map((section, idx) => {
            const sectionConfig: FullQuestionBankConfig = {
                easy: {},
                medium: {},
                hard: {}
            };

            // Distribute counts for each difficulty and type
            (['easy', 'medium', 'hard'] as const).forEach(diff => {
                Object.entries(config[diff]).forEach(([type, count]) => {
                    const { base, remainder } = distribute(count as number);
                    // Distribute remainder to first few sections
                    const sectionCount = base + (idx < remainder ? 1 : 0);

                    if (sectionCount > 0) {
                        sectionConfig[diff][type as QuestionType] = sectionCount;
                    }
                });
            });

            return {
                section,
                config: sectionConfig
            };
        });

        // 4. Process sections in parallel (with concurrency limit)
        // We'll process 3 sections at a time to avoid rate limits
        const BATCH_SIZE = 3;
        for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
            const batch = jobs.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (job) => {
                // Skip if no questions needed for this section
                const hasQuestions = Object.values(job.config).some(d => Object.keys(d).length > 0);
                if (!hasQuestions) return;

                console.log(`[QUESTION-BANK] Generating questions for section Pages ${job.section.startPage}-${job.section.endPage}`);

                try {
                    const questions = await generateBatchQuestions({
                        context: job.section.content,
                        config: job.config,
                        chapterTitle: `Pages ${job.section.startPage}-${job.section.endPage}`, // Context for AI
                        examCategory // Pass the category
                    });

                    // Save to DB
                    if (questions.length > 0) {
                        await prisma.question.createMany({
                            data: questions.map(q => ({
                                chapter_id: bigChapterId,
                                question_text: q.question_text,
                                question_type: q.question_type as QuestionType,
                                difficulty: q.difficulty,
                                options: q.options ? q.options : undefined,
                                correct_answer: q.correct_answer,
                                explanation: q.explanation,
                                points: q.points,
                                is_active: true
                            }))
                        });
                        console.log(`[QUESTION-BANK] Saved ${questions.length} questions for section Pages ${job.section.startPage}-${job.section.endPage}`);
                    }
                } catch (error) {
                    console.error(`[QUESTION-BANK] Failed to generate for section Pages ${job.section.startPage}-${job.section.endPage}:`, error);
                    // Continue with other sections even if one fails
                }
            }));
        }

        console.log(`[QUESTION-BANK] Completed generation for chapter ${chapterId}`);

    } catch (error) {
        console.error(`[QUESTION-BANK] Critical error generating question bank for ${chapterId}:`, error);
        throw error;
    }
}
