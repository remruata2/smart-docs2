import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";
import { checkAIFeatureAccess } from "@/lib/trial-access";

export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const searchParams = request.nextUrl.searchParams;
        const scope = searchParams.get("scope"); // 'subjects' or 'chapters'
        const subjectIdParam = searchParams.get("subjectId");

        // 1. Get Subjects (Enrolled & Active)
        if (scope === 'subjects') {
            const enrolledSubjects = await prisma.subject.findMany({
                where: {
                    is_active: true,
                    courses: {
                        some: {
                            enrollments: {
                                some: {
                                    user_id: userId,
                                    status: 'active'
                                }
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    quizzes_enabled: true,
                    courses: {
                        where: {
                            enrollments: {
                                some: {
                                    user_id: userId,
                                    status: 'active'
                                }
                            }
                        },
                        select: { id: true }
                    },
                    program: {
                        select: {
                            board: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });

            const enrolledCourses = await prisma.course.findMany({
                where: {
                    enrollments: {
                        some: {
                            user_id: userId,
                            status: 'active'
                        }
                    }
                },
                select: {
                    id: true,
                    title: true,
                    subjects: {
                        where: { is_active: true },
                        select: { id: true }
                    }
                }
            });

            return NextResponse.json({
                subjects: enrolledSubjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    board: s.program?.board?.name || '',
                    quizzes_enabled: s.quizzes_enabled,
                    courseIds: s.courses.map((c: any) => c.id)
                })),
                courses: enrolledCourses.map(c => ({
                    id: c.id,
                    title: c.title,
                    subjectIds: c.subjects.map(s => s.id)
                }))
            });
        }

        // 2. Get Chapters (With Trial Lock Status)
        else if (scope === 'chapters') {
            if (!subjectIdParam) {
                return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
            }
            const subjectId = parseInt(subjectIdParam);

            const chapters = await prisma.chapter.findMany({
                where: {
                    subject_id: subjectId,
                    is_active: true,
                },
                select: {
                    id: true,
                    title: true,
                    chapter_number: true,
                    quizzes_enabled: true
                },
                orderBy: { chapter_number: 'asc' }
            });

            // Check AI access for each chapter in parallel
            const chaptersWithStatus = await Promise.all(chapters.map(async (chapter) => {
                const access = await checkAIFeatureAccess(userId, chapter.id, prisma);
                return {
                    id: chapter.id.toString(),
                    title: chapter.title,
                    chapterNumber: chapter.chapter_number,
                    quizzes_enabled: chapter.quizzes_enabled,
                    isLocked: !access.allowed,
                    reason: access.reason
                };
            }));

            return NextResponse.json({
                chapters: chaptersWithStatus
            });
        }

        return NextResponse.json({ error: "Invalid scope parameter" }, { status: 400 });

    } catch (error) {
        console.error("[MOBILE CHAT CONTEXT] Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
