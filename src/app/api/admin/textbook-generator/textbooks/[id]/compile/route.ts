import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { compileBookPDF } from '@/lib/textbook-generator/pdf-generator';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/textbook-generator/textbooks/[id]/compile
 * Compile selected chapters into a complete book PDF
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const textbookId = parseInt(id);

        if (isNaN(textbookId)) {
            return NextResponse.json({ error: 'Invalid textbook ID' }, { status: 400 });
        }

        // Parse request body
        const body = await request.json();
        const {
            chapter_ids,
            options = {
                include_cover: true,
                include_toc: true,
                include_index: false,
            },
        } = body;

        if (!chapter_ids || !Array.isArray(chapter_ids) || chapter_ids.length === 0) {
            return NextResponse.json(
                { error: 'Please select at least one chapter to compile' },
                { status: 400 }
            );
        }

        // Verify chapters belong to this textbook
        const validChapters = await prisma.textbookChapter.findMany({
            where: {
                id: { in: chapter_ids.map((id: number) => id) },
                unit: { textbook_id: textbookId },
                content: { not: null },
            },
        });

        if (validChapters.length === 0) {
            return NextResponse.json(
                { error: 'No valid chapters with content found' },
                { status: 400 }
            );
        }

        if (validChapters.length !== chapter_ids.length) {
            return NextResponse.json(
                {
                    error: `Only ${validChapters.length} of ${chapter_ids.length} chapters have content`,
                    warning: 'Some selected chapters have no content yet',
                },
                { status: 400 }
            );
        }

        console.log(`[COMPILE] Compiling ${validChapters.length} chapters for textbook ${textbookId}`);

        // Compile the book
        const result = await compileBookPDF({
            textbook_id: textbookId,
            chapter_ids: validChapters.map(c => c.id),
            options,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        // Update textbook status to PUBLISHED if fully compiled
        const allChapters = await prisma.textbookChapter.findMany({
            where: {
                unit: { textbook_id: textbookId },
            },
            select: { id: true, status: true },
        });

        const allCompleted = allChapters.every(c => c.status === 'COMPLETED');
        const compiledAll = validChapters.length === allChapters.length;

        if (allCompleted && compiledAll) {
            await prisma.textbook.update({
                where: { id: textbookId },
                data: {
                    status: 'PUBLISHED',
                    progress: 100,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully compiled ${result.result.chapters_included} chapters`,
            result: result.result,
        });

    } catch (error) {
        console.error('Error compiling book:', error);
        return NextResponse.json(
            { error: 'Failed to compile book' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/textbook-generator/textbooks/[id]/compile
 * Get chapters ready for compilation
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const textbookId = parseInt(id);

        // Get all chapters with their status
        const units = await prisma.textbookUnit.findMany({
            where: { textbook_id: textbookId },
            orderBy: { order: 'asc' },
            include: {
                chapters: {
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        chapter_number: true,
                        title: true,
                        status: true,
                        pdf_url: true,
                        content: false, // Don't send full content
                    },
                },
            },
        });

        // Calculate stats
        const allChapters = units.flatMap(u => u.chapters);
        const stats = {
            total: allChapters.length,
            completed: allChapters.filter(c => c.status === 'COMPLETED').length,
            withPdf: allChapters.filter(c => c.pdf_url).length,
            pending: allChapters.filter(c => c.status === 'PENDING').length,
        };

        // Get textbook info
        const textbook = await prisma.textbook.findUnique({
            where: { id: textbookId },
            select: {
                id: true,
                title: true,
                compiled_pdf_url: true,
                status: true,
            },
        });

        return NextResponse.json({
            textbook,
            units,
            stats,
            canCompile: stats.completed > 0,
        });

    } catch (error) {
        console.error('Error fetching compilation info:', error);
        return NextResponse.json(
            { error: 'Failed to fetch compilation info' },
            { status: 500 }
        );
    }
}
