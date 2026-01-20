import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import {
    generateChapterContent,
    saveChapterContent
} from '@/lib/textbook-generator/chapter-generator';
import { generateChapterImages } from '@/lib/textbook-generator/image-generator';
import { generateChapterPDF } from '@/lib/textbook-generator/pdf-generator';
import type { ChapterGenerationOptions } from '@/lib/textbook-generator/types';

interface RouteParams {
    params: Promise<{ id: string; chapterId: string }>;
}

/**
 * POST /api/admin/textbook-generator/textbooks/[id]/chapters/[chapterId]/generate
 * Generate content for a specific chapter
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, chapterId } = await params;
        const textbookId = parseInt(id);
        const chapterIdNum = parseInt(chapterId);

        if (isNaN(textbookId) || isNaN(chapterIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        // Parse request body
        const body = await request.json();
        const {
            customPrompt,
            options = {},
            generateImages = true,
            generatePdf = true,
        } = body;

        // Build generation options
        const generationOptions: ChapterGenerationOptions = {
            includeExamHighlights: options.includeExamHighlights ?? true,
            examTypes: options.examTypes || ['CUET'],
            difficulty: options.difficulty || 'intermediate',
            thinkingLevel: options.thinkingLevel || 'high',
            customPrompt: customPrompt,
            // Overrides from UI
            minWords: options.minWords,
            maxWords: options.maxWords,
            mcqCount: options.mcqCount,
            shortAnswerCount: options.shortAnswerCount,
            longAnswerCount: options.longAnswerCount,
            imageCount: options.imageCount,
        };

        // Verify chapter belongs to textbook
        const chapter = await prisma.textbookChapter.findFirst({
            where: {
                id: chapterIdNum,
                unit: {
                    textbook_id: textbookId,
                },
            },
            include: {
                unit: true,
            },
        });

        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        // Update status to generating
        await prisma.textbookChapter.update({
            where: { id: chapterIdNum },
            data: { status: 'GENERATING' },
        });

        // Start background process
        (async () => {
            try {
                console.log(`[API] Starting background content generation for chapter ${chapterIdNum}`);

                const contentStartTime = Date.now();
                console.log(`[API][CHAPTER-${chapterIdNum}] STEP 1/4: Generating Content...`);
                const contentResult = await generateChapterContent(
                    chapterIdNum,
                    generationOptions,
                    customPrompt
                );

                if (!contentResult.success) {
                    console.error(`[API][CHAPTER-${chapterIdNum}] STEP 1 FAILED after ${Date.now() - contentStartTime}ms: ${contentResult.error}`);
                    throw new Error(contentResult.error);
                }
                console.log(`[API][CHAPTER-${chapterIdNum}] STEP 1 COMPLETED in ${Date.now() - contentStartTime}ms`);

                // 2. Save Content
                const saveStartTime = Date.now();
                console.log(`[API][CHAPTER-${chapterIdNum}] STEP 2/4: Saving Content to DB...`);
                const saveResult = await saveChapterContent(chapterIdNum, contentResult.content);
                if (!saveResult.success) {
                    console.error(`[API][CHAPTER-${chapterIdNum}] STEP 2 FAILED after ${Date.now() - saveStartTime}ms: ${saveResult.error}`);
                    throw new Error(saveResult.error);
                }
                console.log(`[API][CHAPTER-${chapterIdNum}] STEP 2 COMPLETED in ${Date.now() - saveStartTime}ms`);

                // 3. Generate Images
                if (generateImages && contentResult.content.images_to_generate.length > 0) {
                    const imageStartTime = Date.now();
                    console.log(`[API][CHAPTER-${chapterIdNum}] STEP 3/4: Generating ${contentResult.content.images_to_generate.length} images...`);
                    await generateChapterImages(chapterIdNum);
                    console.log(`[API][CHAPTER-${chapterIdNum}] STEP 3 COMPLETED in ${Date.now() - imageStartTime}ms`);
                } else {
                    console.log(`[API][CHAPTER-${chapterIdNum}] STEP 3: Skipping image generation (none requested or none in content)`);
                }

                // 4. Generate PDF
                if (generatePdf) {
                    const pdfStartTime = Date.now();
                    console.log(`[API][CHAPTER-${chapterIdNum}] STEP 4/4: Generating PDF...`);
                    const pdfResult = await generateChapterPDF(chapterIdNum);
                    if (pdfResult.success) {
                        console.log(`[API][CHAPTER-${chapterIdNum}] STEP 4 COMPLETED in ${Date.now() - pdfStartTime}ms. URL: ${pdfResult.result.pdf_url}`);
                    } else {
                        console.error(`[API][CHAPTER-${chapterIdNum}] STEP 4 FAILED after ${Date.now() - pdfStartTime}ms: ${pdfResult.error}`);
                        // Don't throw - allow chapter to still be marked as COMPLETED
                        // The PDF can be regenerated later
                    }
                } else {
                    console.log(`[API][CHAPTER-${chapterIdNum}] STEP 4: Skipping PDF generation`);
                }

                // 5. Mark Chapter as COMPLETED
                console.log(`[API] All tasks done. Marking chapter ${chapterIdNum} as COMPLETED.`);
                await prisma.textbookChapter.update({
                    where: { id: chapterIdNum },
                    data: { status: 'COMPLETED' },
                });

                // 6. Update textbook progress
                const allChapters = await prisma.textbookChapter.findMany({
                    where: {
                        unit: { textbook_id: textbookId },
                    },
                    select: { status: true },
                });

                const completedCount = allChapters.filter(c => c.status === 'COMPLETED').length;
                const progress = Math.round((completedCount / allChapters.length) * 100);

                await prisma.textbook.update({
                    where: { id: textbookId },
                    data: {
                        progress,
                        compiled_pdf_url: null // Reset compiled PDF as it is now outdated
                    },
                });

                console.log(`[API] Background generation completed for chapter ${chapterIdNum}`);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown generation error';
                console.error('[API] Background generation failed:', errorMessage);
                await prisma.textbookChapter.update({
                    where: { id: chapterIdNum },
                    data: {
                        status: 'FAILED',
                        generation_error: errorMessage
                    },
                });
            }
        })();

        return NextResponse.json({
            success: true,
            message: 'Chapter generation started in background',
            status: 'GENERATING'
        }, { status: 202 });
    } catch (error) {
        console.error('Error initiating chapter generation:', error);
        return NextResponse.json(
            { error: 'Failed to initiate chapter generation' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/textbook-generator/textbooks/[id]/chapters/[chapterId]/generate
 * Get chapter generation status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, chapterId } = await params;
        const chapterIdNum = parseInt(chapterId);

        const chapter = await prisma.textbookChapter.findUnique({
            where: { id: chapterIdNum },
            include: {
                images: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        const imageStats = {
            total: chapter.images.length,
            completed: chapter.images.filter(i => i.status === 'COMPLETED').length,
            pending: chapter.images.filter(i => i.status === 'PENDING').length,
            generating: chapter.images.filter(i => i.status === 'GENERATING').length,
            failed: chapter.images.filter(i => i.status === 'FAILED').length,
        };

        return NextResponse.json({
            chapter,
            status: chapter.status,
            hasContent: !!chapter.content,
            hasPdf: !!chapter.pdf_url,
            imageStats,
        });

    } catch (error) {
        console.error('Error fetching chapter status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chapter status' },
            { status: 500 }
        );
    }
}
