import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import type { UpdateTextbookInput } from '@/lib/textbook-generator/types';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/textbook-generator/textbooks/[id]
 * Get a single textbook with all relations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

        const textbook = await prisma.textbook.findUnique({
            where: { id: textbookId },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                units: {
                    orderBy: { order: 'asc' },
                    include: {
                        chapters: {
                            orderBy: { order: 'asc' },
                            include: {
                                images: {
                                    orderBy: { order: 'asc' },
                                },
                            },
                        },
                    },
                },
                generation_jobs: {
                    orderBy: { created_at: 'desc' },
                    take: 10,
                },
                _count: {
                    select: {
                        units: true,
                        generation_jobs: true,
                    },
                },
            },
        });

        if (!textbook) {
            return NextResponse.json({ error: 'Textbook not found' }, { status: 404 });
        }

        return NextResponse.json({ textbook });
    } catch (error) {
        console.error('Error fetching textbook:', error);
        return NextResponse.json(
            { error: 'Failed to fetch textbook' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/textbook-generator/textbooks/[id]
 * Update a textbook
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

        const body: UpdateTextbookInput = await request.json();

        // Check if textbook exists
        const existing = await prisma.textbook.findUnique({
            where: { id: textbookId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Textbook not found' }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {};

        if (body.title !== undefined) updateData.title = body.title.trim();
        if (body.description !== undefined) updateData.description = body.description?.trim() || null;
        if (body.class_level !== undefined) updateData.class_level = body.class_level;
        if (body.stream !== undefined) updateData.stream = body.stream;
        if (body.subject_name !== undefined) updateData.subject_name = body.subject_name?.trim() || null;
        if (body.board_id !== undefined) updateData.board_id = body.board_id;
        if (body.academic_year !== undefined) updateData.academic_year = body.academic_year?.trim() || null;
        if (body.author !== undefined) updateData.author = body.author?.trim() || null;
        if (body.raw_syllabus !== undefined) updateData.raw_syllabus = body.raw_syllabus?.trim() || null;
        if (body.status !== undefined) updateData.status = body.status;
        if ((body as any).content_style !== undefined) updateData.content_style = (body as any).content_style;

        const textbook = await prisma.textbook.update({
            where: { id: textbookId },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        units: true,
                        generation_jobs: true,
                    },
                },
            },
        });

        return NextResponse.json({ textbook });
    } catch (error) {
        console.error('Error updating textbook:', error);
        return NextResponse.json(
            { error: 'Failed to update textbook' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/textbook-generator/textbooks/[id]
 * Delete a textbook
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

        // Check if textbook exists
        const existing = await prisma.textbook.findUnique({
            where: { id: textbookId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Textbook not found' }, { status: 404 });
        }

        // Delete textbook (cascade will handle units, chapters, etc.)
        await prisma.textbook.delete({
            where: { id: textbookId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting textbook:', error);
        return NextResponse.json(
            { error: 'Failed to delete textbook' },
            { status: 500 }
        );
    }
}
