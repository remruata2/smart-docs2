import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { updateSyllabus } from '@/lib/textbook-generator/syllabus-manager';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const syllabusId = parseInt(id);

        const syllabus = await prisma.syllabus.findUnique({
            where: { id: syllabusId },
            include: {
                units: {
                    orderBy: { order: 'asc' },
                    include: {
                        chapters: {
                            orderBy: { order: 'asc' }
                        }
                    }
                },
                _count: {
                    select: { textbooks: true }
                }
            }
        });

        if (!syllabus) {
            return NextResponse.json({ error: 'Syllabus not found' }, { status: 404 });
        }

        return NextResponse.json({ syllabus });
    } catch (error) {
        console.error('Error fetching syllabus:', error);
        return NextResponse.json({ error: 'Failed to fetch syllabus' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const syllabusId = parseInt(id);
        const body = await request.json();

        const syllabus = await updateSyllabus(syllabusId, body);
        return NextResponse.json({ syllabus });

    } catch (error) {
        console.error('Error updating syllabus:', error);
        return NextResponse.json({ error: 'Failed to update syllabus' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const syllabusId = parseInt(id);

        await prisma.syllabus.delete({
            where: { id: syllabusId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting syllabus:', error);
        return NextResponse.json({ error: 'Failed to delete syllabus' }, { status: 500 });
    }
}
