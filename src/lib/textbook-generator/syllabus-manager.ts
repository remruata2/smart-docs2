import { prisma } from '@/lib/prisma';
import {
    ParsedSyllabus,
    ParsedUnit,
    CreateSyllabusInput,
    UpdateSyllabusInput,
    SyllabusStatus,
    CreateTextbookInput
} from './types';
import { parseSyllabus } from './syllabus-parser';

/**
 * Syllabus Manager Service
 * Handles CRUD for Syllabi and generating Textbooks from them
 */

export async function createSyllabus(data: CreateSyllabusInput) {
    return await prisma.$transaction(async (tx) => {
        const syllabus = await tx.syllabus.create({
            data: {
                title: data.title,
                description: data.description,
                class_level: data.class_level,
                stream: data.stream,
                subject: data.subject,
                board: data.board || 'MBSE',
                academic_year: data.academic_year,
                exam_category: data.exam_category || 'academic_board', // Default to academic board
                raw_text: data.raw_text,
                status: data.units && data.units.length > 0 ? 'PARSED' : 'DRAFT'
            }
        });

        if (data.units && data.units.length > 0) {
            for (let i = 0; i < data.units.length; i++) {
                const unit = data.units[i];
                const createdUnit = await tx.syllabusUnit.create({
                    data: {
                        syllabus_id: syllabus.id,
                        title: unit.title,
                        order: i + 1,
                        description: `Unit ${i + 1}`
                    }
                });

                if (unit.chapters && unit.chapters.length > 0) {
                    await tx.syllabusChapter.createMany({
                        data: unit.chapters.map((ch, idx) => ({
                            unit_id: createdUnit.id,
                            chapter_number: ch.number,
                            title: ch.title,
                            order: idx + 1,
                            subtopics: JSON.stringify(ch.subtopics || [])
                        }))
                    });
                }
            }
        }

        return syllabus;
    });
}

export async function updateSyllabus(id: number, input: UpdateSyllabusInput & { raw_text?: string }) {
    const { units, ...data } = input;
    return await prisma.syllabus.update({
        where: { id },
        data: {
            ...data,
        }
    });
}

export async function parseAndSaveSyllabus(id: number) {
    const syllabus = await prisma.syllabus.findUnique({
        where: { id }
    });

    if (!syllabus || !syllabus.raw_text) {
        throw new Error('Syllabus not found or no raw text available');
    }

    // Update status
    await prisma.syllabus.update({
        where: { id },
        data: { status: 'PARSING' }
    });

    try {
        const result = await parseSyllabus(syllabus.raw_text, {
            subjectHint: syllabus.subject,
            classHint: syllabus.class_level as any,
            streamHint: syllabus.stream as any
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        const parsed = result.data!;

        // Transaction to replace existing structure
        await prisma.$transaction(async (tx) => {
            // clear old units/chapters
            await tx.syllabusUnit.deleteMany({
                where: { syllabus_id: id }
            });

            // create new units and chapters
            for (let i = 0; i < parsed.units.length; i++) {
                const unit = parsed.units[i];
                const createdUnit = await tx.syllabusUnit.create({
                    data: {
                        syllabus_id: id,
                        title: unit.title,
                        order: i + 1,
                        description: `Unit ${i + 1} of syllabus`
                    }
                });

                if (unit.chapters && unit.chapters.length > 0) {
                    await tx.syllabusChapter.createMany({
                        data: unit.chapters.map((ch, idx) => ({
                            unit_id: createdUnit.id,
                            chapter_number: ch.number,
                            title: ch.title,
                            order: idx + 1,
                            subtopics: JSON.stringify(ch.subtopics || [])
                        }))
                    });
                }
            }

            // Update syllabus status and metadata if missing
            await tx.syllabus.update({
                where: { id },
                data: {
                    status: 'PARSED',
                    // Auto-fill metadata if it was missing/detected
                    stream: syllabus.stream || parsed.stream || null
                }
            });
        });

        return { success: true };

    } catch (error) {
        await prisma.syllabus.update({
            where: { id },
            data: { status: 'DRAFT' } // Revert to draft on failure
        });
        throw error;
    }
}

/**
 * Creates a new textbook based on an existing Parsed Syllabus
 */
export async function createTextbookFromSyllabus(
    syllabusId: number,
    overrides: Partial<CreateTextbookInput>,
    userId: number
) {
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
            }
        }
    });

    if (!syllabus) throw new Error('Syllabus not found');
    if (syllabus.status !== 'PARSED') throw new Error('Syllabus must be parsed before creating a textbook');

    // Create Textbook
    const textbook = await prisma.textbook.create({
        data: {
            title: overrides.title || syllabus.title,
            description: overrides.description || syllabus.description,
            class_level: overrides.class_level || syllabus.class_level,
            stream: overrides.stream || syllabus.stream,
            subject_name: overrides.subject_name || syllabus.subject,
            board_id: overrides.board_id || syllabus.board,
            academic_year: overrides.academic_year || syllabus.academic_year,
            author: overrides.author,
            raw_syllabus: syllabus.raw_text, // Keep a copy or reference? User wants ref.
            syllabus_id: syllabus.id,
            status: 'DRAFT',
            created_by: userId
        }
    });

    // Copy Structure
    // Since we need to link content, we iterate.
    for (const sUnit of syllabus.units) {
        const tUnit = await prisma.textbookUnit.create({
            data: {
                textbook_id: textbook.id,
                title: sUnit.title,
                order: sUnit.order,
                description: sUnit.description
            }
        });

        for (const sChapter of sUnit.chapters) {
            await prisma.textbookChapter.create({
                data: {
                    unit_id: tUnit.id,
                    chapter_number: sChapter.chapter_number,
                    title: sChapter.title,
                    order: sChapter.order,
                    subtopics: JSON.stringify(sChapter.subtopics),
                    status: 'PENDING'
                }
            });
        }
    }

    return textbook;
}
