import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

/**
 * POST /api/admin/textbook-generator/textbooks/[id]/chapters/[chapterId]/stop
 * Stops a generating chapter by resetting its status to PENDING
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, chapterId } = await params;

        // Find the chapter and verify it belongs to this textbook
        const chapter = await prisma.textbookChapter.findFirst({
            where: {
                id: parseInt(chapterId),
                unit: {
                    textbook_id: parseInt(id)
                }
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        if (chapter.status !== 'GENERATING') {
            return NextResponse.json(
                { error: 'Chapter is not currently generating', status: chapter.status },
                { status: 400 }
            );
        }

        // Reset to PENDING
        const updated = await prisma.textbookChapter.update({
            where: { id: parseInt(chapterId) },
            data: {
                status: 'PENDING',
                updated_at: new Date()
            },
            select: {
                id: true,
                status: true,
                title: true
            }
        });

        console.log(`[API] Stopped generation for chapter ${chapterId}: ${updated.title}`);

        return NextResponse.json({
            success: true,
            message: `Stopped generation for "${updated.title}"`,
            chapter: updated
        });

    } catch (error) {
        console.error('[API] Error stopping chapter generation:', error);
        return NextResponse.json(
            { error: 'Failed to stop generation' },
            { status: 500 }
        );
    }
}
