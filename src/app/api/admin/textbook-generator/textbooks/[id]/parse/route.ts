import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parseSyllabus, generateStructureFromParsed } from '@/lib/textbook-generator/syllabus-parser';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/textbook-generator/textbooks/[id]/parse
 * Parse the raw syllabus and create units/chapters
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

        // Get textbook
        const textbook = await prisma.textbook.findUnique({
            where: { id: textbookId },
            include: {
                units: true, // Check if units already exist
            },
        });

        if (!textbook) {
            return NextResponse.json({ error: 'Textbook not found' }, { status: 404 });
        }

        if (!textbook.raw_syllabus) {
            return NextResponse.json({ error: 'No syllabus text to parse. Please add syllabus content first.' }, { status: 400 });
        }

        // Optional: Get hints from request body
        const body = await request.json().catch(() => ({}));
        const hints = {
            subjectHint: body.subjectHint || textbook.subject_name,
            classHint: body.classHint || textbook.class_level as 'XI' | 'XII',
            streamHint: body.streamHint || textbook.stream as 'Arts' | 'Science' | 'Commerce' | undefined,
        };

        // Update status to PARSING
        await prisma.textbook.update({
            where: { id: textbookId },
            data: { status: 'PARSING' },
        });

        // Parse the syllabus using AI
        const parseResult = await parseSyllabus(textbook.raw_syllabus, hints);

        if (!parseResult.success) {
            // Revert status on failure
            await prisma.textbook.update({
                where: { id: textbookId },
                data: { status: 'DRAFT' },
            });
            return NextResponse.json({ error: parseResult.error }, { status: 422 });
        }

        const parsed = parseResult.data;
        const structure = generateStructureFromParsed(parsed);

        // Delete existing units if any (for re-parsing)
        if (textbook.units.length > 0) {
            await prisma.textbookUnit.deleteMany({
                where: { textbook_id: textbookId },
            });
        }

        // Create units and chapters in database
        for (const unitData of structure.units) {
            const unit = await prisma.textbookUnit.create({
                data: {
                    textbook_id: textbookId,
                    title: unitData.title,
                    order: unitData.order,
                },
            });

            // Create chapters for this unit
            for (const chapterData of unitData.chapters) {
                await prisma.textbookChapter.create({
                    data: {
                        unit_id: unit.id,
                        chapter_number: chapterData.chapter_number,
                        title: chapterData.title,
                        order: chapterData.order,
                        subtopics: chapterData.subtopics,
                        status: 'PENDING',
                    },
                });
            }
        }

        // Update textbook with parsed info and status
        const totalChapters = structure.units.reduce((acc, u) => acc + u.chapters.length, 0);

        await prisma.textbook.update({
            where: { id: textbookId },
            data: {
                status: 'DRAFT', // Back to DRAFT, ready for content generation
                subject_name: parsed.subject || textbook.subject_name,
                stream: parsed.stream || textbook.stream,
                progress: 5, // Small progress for completing parsing
            },
        });

        // Fetch the updated textbook with relations
        const updatedTextbook = await prisma.textbook.findUnique({
            where: { id: textbookId },
            include: {
                units: {
                    orderBy: { order: 'asc' },
                    include: {
                        chapters: {
                            orderBy: { order: 'asc' },
                        },
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: `Successfully parsed syllabus: ${structure.units.length} units, ${totalChapters} chapters`,
            textbook: updatedTextbook,
            parsed: parsed,
        });

    } catch (error) {
        console.error('Error parsing syllabus:', error);
        return NextResponse.json(
            { error: 'Failed to parse syllabus' },
            { status: 500 }
        );
    }
}
