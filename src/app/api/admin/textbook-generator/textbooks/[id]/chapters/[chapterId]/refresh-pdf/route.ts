import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateChapterPDF } from '@/lib/textbook-generator/pdf-generator';

interface RouteParams {
    params: Promise<{ id: string; chapterId: string }>;
}

/**
 * POST /api/admin/textbook-generator/textbooks/[id]/chapters/[chapterId]/refresh-pdf
 * Regenerate PDF for a specific chapter without re-generating content
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, chapterId } = await params;
        const chapterIdNum = parseInt(chapterId);

        if (isNaN(chapterIdNum)) {
            return NextResponse.json({ error: 'Invalid Chapter ID' }, { status: 400 });
        }

        const chapter = await prisma.textbookChapter.findUnique({
            where: { id: chapterIdNum },
            include: {
                unit: {
                    select: { textbook_id: true }
                }
            }
        });

        if (!chapter || !chapter.content) {
            return NextResponse.json({ error: 'Chapter content not found. Please generate content first.' }, { status: 404 });
        }

        console.log(`[API] Refreshing PDF for chapter ${chapterIdNum}`);

        const result = await generateChapterPDF(chapterIdNum);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            pdf_url: result.result.pdf_url,
            message: 'PDF refreshed successfully'
        });

    } catch (error) {
        console.error('Error refreshing chapter PDF:', error);
        return NextResponse.json(
            { error: 'Failed to refresh PDF' },
            { status: 500 }
        );
    }
}
