import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { parseAndSaveSyllabus } from '@/lib/textbook-generator/syllabus-manager';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const syllabusId = parseInt(id);

        // This process might take time, in real prod use background job.
        // For Vercel lambda (10-60s), parsing text is usually fast (5-10s).
        const result = await parseAndSaveSyllabus(syllabusId);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error parsing syllabus:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to parse syllabus'
        }, { status: 500 });
    }
}
