import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createSyllabus } from '@/lib/textbook-generator/syllabus-manager';
import type { CreateSyllabusInput } from '@/lib/textbook-generator/types';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const syllabi = await prisma.syllabus.findMany({
            orderBy: { updated_at: 'desc' },
            include: {
                _count: {
                    select: { units: true, textbooks: true }
                }
            }
        });

        return NextResponse.json({ syllabi });
    } catch (error) {
        console.error('Error fetching syllabi:', error);
        return NextResponse.json({ error: 'Failed to fetch syllabi' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: CreateSyllabusInput = await request.json();

        // Validation
        if (!body.title || !body.subject || !body.class_level) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const syllabus = await createSyllabus(body);
        return NextResponse.json({ syllabus }, { status: 201 });

    } catch (error) {
        console.error('Error creating syllabus:', error);
        return NextResponse.json({ error: 'Failed to create syllabus' }, { status: 500 });
    }
}
