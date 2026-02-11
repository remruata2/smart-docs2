import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { processChapterBackground } from "@/lib/chapter-processor";
import { getQuestionDefaults } from "@/lib/question-bank-defaults";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CHAPTERS_PER_SUBJECT = 5;

export async function GET(req: NextRequest) {
    try {
        const user = await getMobileUser(req);
        const userId = Number(user.id);

        const { searchParams } = new URL(req.url);
        const courseIdStr = searchParams.get("courseId");

        if (!courseIdStr) {
            return NextResponse.json({ error: "courseId is required" }, { status: 400 });
        }

        const courseId = parseInt(courseIdStr);

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

        // Fix BigInt serialization: Omit raw chapters from subjectData
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
    } catch (error: any) {
        console.error("Error fetching mobile student chapters:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch chapters" }, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}

export async function POST(req: NextRequest) {
    console.log("[DEBUG-POST] Received mobile student chapter upload request");
    try {
        const user = await getMobileUser(req);
        const userId = Number(user.id);
        console.log(`[DEBUG-POST] Authenticated user ID: ${userId}`);

        const formData = await req.formData();
        console.log("[DEBUG-POST] Parsed form data");

        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const courseIdStr = formData.get("courseId") as string;
        const subjectName = formData.get("subjectName") as string || "My Notes";

        console.log(`[DEBUG-POST] Title: ${title}, CourseId: ${courseIdStr}, Subject: ${subjectName}`);
        if (file) {
            console.log(`[DEBUG-POST] File received: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
        } else {
            console.error("[DEBUG-POST] No file found in form data");
        }

        if (!file || !title || !courseIdStr) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 413 });
        }

        const courseId = parseInt(courseIdStr);

        const enrollment = await prisma.userEnrollment.findFirst({
            where: {
                user_id: userId,
                course_id: courseId
            }
        });

        if (!enrollment) {
            console.warn(`[DEBUG-POST] User ${userId} not enrolled in course ${courseId}`);
            return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 });
        }

        let subject = await prisma.subject.findFirst({
            where: {
                created_by_user_id: userId,
                courses: {
                    some: { id: courseId }
                }
            }
        });

        if (!subject) {
            console.log("[DEBUG-POST] Creating new custom subject for user");
            const program = await prisma.program.findFirst({
                where: {
                    board_id: 'USER_CONTENT',
                    name: 'Custom Content'
                }
            });

            if (!program) {
                console.error("[DEBUG-POST] Custom Content program missing from database");
                throw new Error("Custom Content infrastructure not found.");
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

        const chapterCount = await prisma.chapter.count({
            where: { subject_id: subject.id }
        });

        if (chapterCount >= MAX_CHAPTERS_PER_SUBJECT) {
            return NextResponse.json({ error: `You can only upload up to ${MAX_CHAPTERS_PER_SUBJECT} chapters.` }, { status: 400 });
        }

        console.log("[DEBUG-POST] Creating chapter record as PENDING");
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

        const questionConfig = getQuestionDefaults('academic_board', subject.name);

        console.log(`[DEBUG-POST] Chapter ${chapter.id} created. Starting background processing.`);
        setImmediate(async () => {
            try {
                await processChapterBackground({
                    chapterId: chapter.id.toString(),
                    pdfBuffer,
                    fileName: file.name,
                    questionConfig
                });
            } catch (error) {
                console.error(`Failed to process mobile student chapter ${chapter.id}:`, error);
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
                id: chapter.id.toString(),
                title: chapter.title,
                subject_id: chapter.subject_id.toString(),
                processing_status: chapter.processing_status,
                created_at: chapter.created_at
            }
        });
    } catch (error: any) {
        console.error("Error creating mobile student chapter:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}
