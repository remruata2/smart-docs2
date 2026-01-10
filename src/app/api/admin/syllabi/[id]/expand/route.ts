import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { splitAndExpandSyllabus, isEligibleForSplit } from '@/lib/textbook-generator/syllabus-splitter';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/syllabi/[id]/expand
 * 
 * Splits a parent syllabus into multiple child syllabi (one per broad topic)
 * and expands each with AI-generated chapters and subtopics.
 * 
 * Only available for competitive exam categories (government_prelims, government_mains, banking)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin authentication required' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const syllabusId = parseInt(id, 10);

        if (isNaN(syllabusId)) {
            return NextResponse.json(
                { error: 'Invalid syllabus ID' },
                { status: 400 }
            );
        }

        // Check if syllabus exists and is eligible for splitting
        const syllabus = await prisma.syllabus.findUnique({
            where: { id: syllabusId },
            select: {
                id: true,
                title: true,
                exam_category: true,
                syllabus_mode: true,
                status: true,
            },
        });

        if (!syllabus) {
            return NextResponse.json(
                { error: 'Syllabus not found' },
                { status: 404 }
            );
        }

        // Check if already split
        if (syllabus.syllabus_mode === 'multi_split') {
            const children = await prisma.syllabus.findMany({
                where: { parent_syllabus_id: syllabusId },
                select: { id: true, title: true },
            });
            return NextResponse.json({
                message: 'Syllabus already split',
                syllabi: children,
            });
        }

        // Check eligibility
        if (!isEligibleForSplit(syllabus.exam_category)) {
            return NextResponse.json(
                { error: `Splitting is only available for competitive exam categories. Current: ${syllabus.exam_category}` },
                { status: 400 }
            );
        }

        // Check if parsed
        if (syllabus.status !== 'PARSED') {
            return NextResponse.json(
                { error: 'Syllabus must be parsed before splitting. Current status: ' + syllabus.status },
                { status: 400 }
            );
        }

        // Parse request body for options
        let stateContext: string | undefined;
        try {
            const body = await request.json();
            stateContext = body.stateContext;
        } catch {
            // No body or invalid JSON - that's fine
        }

        // Perform the split
        console.log(`[API] Starting syllabus split for ID: ${syllabusId}`);
        const result = await splitAndExpandSyllabus(syllabusId, { stateContext });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully created ${result.syllabi?.length} syllabi from parent`,
            syllabi: result.syllabi,
        });

    } catch (error) {
        console.error('[API] Error expanding syllabus:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/syllabi/[id]/expand
 * 
 * Get child syllabi of a parent syllabus
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin authentication required' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const syllabusId = parseInt(id, 10);

        if (isNaN(syllabusId)) {
            return NextResponse.json(
                { error: 'Invalid syllabus ID' },
                { status: 400 }
            );
        }

        const children = await prisma.syllabus.findMany({
            where: { parent_syllabus_id: syllabusId },
            include: {
                units: {
                    include: {
                        chapters: {
                            orderBy: { order: 'asc' },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { created_at: 'asc' },
        });

        const parent = await prisma.syllabus.findUnique({
            where: { id: syllabusId },
            select: {
                syllabus_mode: true,
                exam_category: true,
            },
        });

        return NextResponse.json({
            parent: {
                id: syllabusId,
                syllabus_mode: parent?.syllabus_mode,
                exam_category: parent?.exam_category,
                isEligibleForSplit: isEligibleForSplit(parent?.exam_category),
            },
            children: children.map(s => ({
                id: s.id,
                title: s.title,
                subject: s.subject,
                chaptersCount: s.units.reduce((acc, u) => acc + u.chapters.length, 0),
                status: s.status,
            })),
        });

    } catch (error) {
        console.error('[API] Error getting child syllabi:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
