import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string; chapterId: string }>;
}

// Type for the new hierarchical format
interface TopicWithSubtopics {
    title: string;
    subtopics: string[];
}

/**
 * Migrate old format (string[]) to new format (TopicWithSubtopics[])
 */
function migrateToNewFormat(data: any): TopicWithSubtopics[] {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    // Check if already in new format (array of objects with title property)
    if (typeof data[0] === 'object' && data[0] !== null && 'title' in data[0]) {
        return data as TopicWithSubtopics[];
    }

    // Migrate from old format (array of strings)
    return (data as string[]).map(title => ({
        title: String(title),
        subtopics: []
    }));
}

/**
 * PUT /api/admin/syllabi/[id]/chapters/[chapterId]/subtopics
 * Update topics for a specific syllabus chapter
 * Accepts either:
 *   - { topics: TopicWithSubtopics[] } (new format)
 *   - { subtopics: string[] } (old format, auto-migrated)
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

        // Accept either "topics" (new format) or "subtopics" (old format)
        let topicsToSave: TopicWithSubtopics[];

        if (body.topics && Array.isArray(body.topics)) {
            // New format: already structured
            topicsToSave = migrateToNewFormat(body.topics);
        } else if (body.subtopics && Array.isArray(body.subtopics)) {
            // Old format: migrate to new structure
            topicsToSave = migrateToNewFormat(body.subtopics);
        } else {
            return NextResponse.json({ error: 'Topics or subtopics must be provided as an array' }, { status: 400 });
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

        // Update topics (stored in the 'subtopics' column for backward compatibility)
        const updatedChapter = await prisma.syllabusChapter.update({
            where: { id: chapterIdNum },
            data: {
                subtopics: topicsToSave as any, // Cast needed for Prisma Json type
            },
        });

        return NextResponse.json({
            success: true,
            topics: updatedChapter.subtopics,
        });

    } catch (error) {
        console.error('Error updating topics:', error);
        return NextResponse.json(
            { error: 'Failed to update topics' },
            { status: 500 }
        );
    }
}
