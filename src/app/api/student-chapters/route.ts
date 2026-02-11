import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { processChapterBackground } from "@/lib/chapter-processor";
import { getQuestionDefaults } from "@/lib/question-bank-defaults";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CHAPTERS_PER_SUBJECT = 5;

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseIdStr = searchParams.get("courseId");

    if (!courseIdStr) {
        return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    const userId = parseInt((session.user as any).id);
    const courseId = parseInt(courseIdStr);

    try {
        // Find the custom subject for this course (if it exists)
        // We link custom subjects to the course via the CourseToSubject relation
        const subject = await prisma.subject.findFirst({
            where: {
                created_by_user_id: userId,
                courses: {
                    some: { id: courseId }
                }
            },
            include: {
                chapters: {
                    orderBy: { created_at: 'desc' },
                    include: {
                        _count: {
                            select: { questions: true }
                        },
                        study_materials: {
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!subject) {
            return NextResponse.json({ subject: null, chapters: [] });
        }

        // Serialize BigInts and prepare response
        const { chapters: rawChapters, ...subjectData } = subject;

        const serializedChapters = rawChapters.map(c => ({
            id: c.id.toString(),
            title: c.title,
            processing_status: c.processing_status,
            error_message: c.error_message,
            created_at: c.created_at,
            subject_id: c.subject_id.toString(),
            hasStudyMaterial: !!c.study_materials,
            questionCount: c._count.questions
        }));

        return NextResponse.json({
            subject: {
                ...subjectData,
                id: subject.id.toString(),
                created_by_user_id: subject.created_by_user_id?.toString()
            },
            chapters: serializedChapters
        });
    } catch (error) {
        console.error("Error fetching student chapters:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const courseIdStr = formData.get("courseId") as string;
        const subjectName = formData.get("subjectName") as string || "My Notes";

        if (!file || !title || !courseIdStr) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 413 });
        }

        const courseId = parseInt(courseIdStr);

        // 2. Validate enrollment
        const enrollment = await prisma.userEnrollment.findFirst({
            where: {
                user_id: userId,
                course_id: courseId
            }
        });

        if (!enrollment) {
            return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
        }

        // 3. Find or Create Custom Subject for this course
        let subject = await prisma.subject.findFirst({
            where: {
                created_by_user_id: userId,
                courses: {
                    some: { id: courseId }
                }
            }
        });

        if (!subject) {
            // Find the Custom Content program
            const program = await prisma.program.findFirst({
                where: {
                    board_id: 'USER_CONTENT',
                    name: 'Custom Content'
                }
            });

            if (!program) {
                throw new Error("Custom Content infrastructure not found. Please run seed script.");
            }

            subject = await prisma.subject.create({
                data: {
                    name: subjectName,
                    program_id: program.id,
                    created_by_user_id: userId,
                    courses: {
                        connect: { id: courseId }
                    }
                }
            });
        }

        // 4. Check chapter count limit
        const chapterCount = await prisma.chapter.count({
            where: { subject_id: subject.id }
        });

        if (chapterCount >= MAX_CHAPTERS_PER_SUBJECT) {
            return NextResponse.json({ error: `You can only upload up to ${MAX_CHAPTERS_PER_SUBJECT} chapters per subject.` }, { status: 400 });
        }

        // 5. Create Chapter PENDING
        const pdfBuffer = Buffer.from(await file.arrayBuffer());

        const chapter = await prisma.chapter.create({
            data: {
                title,
                subject_id: subject.id,
                content_json: [],
                processing_status: "PENDING",
                accessible_boards: ["USER_CONTENT"],
                is_global: false,
                is_active: true
            }
        });

        // 6. Trigger background processing (Reuse existing pipeline)
        // We use getQuestionDefaults for fixed quantities
        const questionConfig = getQuestionDefaults('academic_board', subject.name);

        // Fire and forget
        setImmediate(async () => {
            try {
                await processChapterBackground({
                    chapterId: chapter.id.toString(),
                    pdfBuffer,
                    fileName: file.name,
                    questionConfig
                });
            } catch (error) {
                console.error(`Failed to process student chapter ${chapter.id}:`, error);
                await prisma.chapter.update({
                    where: { id: chapter.id },
                    data: {
                        processing_status: "FAILED",
                        error_message: error instanceof Error ? error.message : "Background processing failed"
                    }
                });
            }
        });

        return NextResponse.json({
            success: true,
            chapter: {
                ...chapter,
                id: chapter.id.toString(),
                subject_id: chapter.subject_id.toString()
            }
        });

    } catch (error) {
        console.error("Error creating student chapter:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
