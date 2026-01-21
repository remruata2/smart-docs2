import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import type { CreateTextbookInput, TextbookFilters } from '@/lib/textbook-generator/types';

/**
 * GET /api/admin/textbook-generator/textbooks
 * List all textbooks with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filters: TextbookFilters = {
            status: searchParams.get('status') as TextbookFilters['status'] || undefined,
            class_level: searchParams.get('class_level') as TextbookFilters['class_level'] || undefined,
            stream: searchParams.get('stream') as TextbookFilters['stream'] || undefined,
            search: searchParams.get('search') || undefined,
        };
        const examId = searchParams.get('exam_id');

        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const skip = (page - 1) * pageSize;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.class_level) {
            where.class_level = filters.class_level;
        }
        if (filters.stream) {
            where.stream = filters.stream;
        }
        if (examId && examId !== 'all') {
            where.exam_id = examId;
        }
        if (filters.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { subject_name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [textbooks, total] = await Promise.all([
            prisma.textbook.findMany({
                where,
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
                    exam: true,
                },
                orderBy: { updated_at: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.textbook.count({ where }),
        ]);

        return NextResponse.json({
            textbooks,
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error('Error fetching textbooks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch textbooks' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/textbook-generator/textbooks
 * Create a new textbook
 */
export async function POST(request: NextRequest) {
    console.log('POST /api/admin/textbook-generator/textbooks called');
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CreateTextbookInput = await request.json();

        // Validate required fields
        if (!body.title?.trim()) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        if (!body.class_level) {
            return NextResponse.json({ error: 'Class level is required' }, { status: 400 });
        }

        // Get user ID from session
        const userId = parseInt(session.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            console.error(`User with email ${session.user.email} not found in database`);
            return NextResponse.json({ error: 'User record not found. Please logout and login again.' }, { status: 401 });
        }

        if (body.syllabus_id) {
            const { createTextbookFromSyllabus } = await import('@/lib/textbook-generator/syllabus-manager');
            try {
                // Option B: If exam_id provided and syllabus has no exam, propagate to syllabus
                if (body.exam_id) {
                    const syllabus = await prisma.syllabus.findUnique({
                        where: { id: body.syllabus_id },
                        select: { exam_id: true },
                    });
                    if (syllabus && !syllabus.exam_id) {
                        await prisma.syllabus.update({
                            where: { id: body.syllabus_id },
                            data: { exam_id: body.exam_id },
                        });
                    }
                }
                const textbook = await createTextbookFromSyllabus(body.syllabus_id, body, user.id);
                return NextResponse.json({ textbook }, { status: 201 });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
        }

        // Create textbook
        const textbook = await prisma.textbook.create({
            data: {
                title: body.title.trim(),
                description: body.description?.trim() || null,
                class_level: body.class_level,
                stream: body.stream || null,
                subject_name: body.subject_name?.trim() || null,
                board_id: body.board_id || 'MBSE',
                academic_year: body.academic_year?.trim() || null,
                author: body.author?.trim() || null,
                raw_syllabus: body.raw_syllabus?.trim() || null,
                status: 'DRAFT',
                progress: 0,
                created_by: user.id,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({ textbook }, { status: 201 });
    } catch (error) {
        console.error('Error creating textbook:', error);
        return NextResponse.json(
            { error: 'Failed to create textbook' },
            { status: 500 }
        );
    }
}
