import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string; chapterId: string }>;
}

/**
 * PUT /api/admin/syllabi/[id]/chapters/[chapterId]/subtopics
 * Update subtopics for a specific syllabus chapter
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, chapterId } = await params;
        const syllabusId = parseInt(id);
        const chapterIdNum = parseInt(chapterId);

        if (isNaN(syllabusId) || isNaN(chapterIdNum)) {
            return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
        }

        const body = await request.json();
        const { subtopics } = body;

        // Validate subtopics is an array of strings
        if (!Array.isArray(subtopics)) {
            return NextResponse.json({ error: 'Subtopics must be an array' }, { status: 400 });
        }

        // Verify chapter belongs to syllabus
        const chapter = await prisma.syllabusChapter.findFirst({
            where: {
                id: chapterIdNum,
                unit: {
                    syllabus_id: syllabusId,
                },
            },
        });

        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        // Update subtopics
        const updatedChapter = await prisma.syllabusChapter.update({
            where: { id: chapterIdNum },
            data: {
                subtopics: subtopics,
            },
        });

        return NextResponse.json({
            success: true,
            subtopics: updatedChapter.subtopics,
        });

    } catch (error) {
        console.error('Error updating subtopics:', error);
        return NextResponse.json(
            { error: 'Failed to update subtopics' },
            { status: 500 }
        );
    }
}
