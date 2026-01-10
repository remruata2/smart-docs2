import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { parseAndSaveSyllabus } from '@/lib/textbook-generator/syllabus-manager';
import { splitAndExpandSyllabus } from '@/lib/textbook-generator/syllabus-splitter';
import { prisma } from '@/lib/prisma';

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

        // Parse request body for options
        let stateContext: string | undefined;
        try {
            const body = await request.json();
            stateContext = body.stateContext;
        } catch {
            // No body - that's fine
        }

        // Step 1: Parse the syllabus
        const result = await parseAndSaveSyllabus(syllabusId);

        // Step 2: Check if multi_split mode and auto-expand
        const syllabus = await prisma.syllabus.findUnique({
            where: { id: syllabusId },
            select: { syllabus_mode: true },
        });

        if (syllabus?.syllabus_mode === 'multi_split') {
            console.log(`[PARSE] Syllabus ${syllabusId} is multi_split mode, triggering expansion...`);

            const expandResult = await splitAndExpandSyllabus(syllabusId, { stateContext });

            if (expandResult.success) {
                return NextResponse.json({
                    ...result,
                    split: true,
                    childSyllabi: expandResult.syllabi,
                    message: `Parsed and split into ${expandResult.syllabi?.length || 0} separate syllabi`,
                });
            } else {
                return NextResponse.json({
                    ...result,
                    split: false,
                    splitError: expandResult.error,
                    message: 'Parsed successfully but splitting failed: ' + expandResult.error,
                });
            }
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error parsing syllabus:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to parse syllabus'
        }, { status: 500 });
    }
}
