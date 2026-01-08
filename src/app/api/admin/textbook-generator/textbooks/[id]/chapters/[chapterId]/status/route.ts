import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

/**
 * GET /api/admin/textbook-generator/textbooks/[id]/chapters/[chapterId]/status
 * Returns just the status of a specific chapter for efficient polling
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, chapterId } = await params;

        const chapter = await prisma.textbookChapter.findFirst({
            where: {
                id: parseInt(chapterId),
                unit: {
                    textbook_id: parseInt(id)
                }
            },
            select: {
                id: true,
                status: true,
                pdf_url: true,
                updated_at: true,
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        return NextResponse.json({ chapter });

    } catch (error) {
        console.error('[API] Error fetching chapter status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chapter status' },
            { status: 500 }
        );
    }
}
