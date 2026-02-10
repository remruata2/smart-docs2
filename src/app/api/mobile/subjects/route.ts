import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-SUBJECTS] Incoming request: ${request.url}`);

    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const enrolledOnly = searchParams.get("enrolledOnly") === "true";

        console.log(`[DEBUG-MOBILE-SUBJECTS] enrolledOnly: ${enrolledOnly}, courseId: ${courseId}`);

        const user = await getMobileUser(request);
        console.log(`[DEBUG-MOBILE-SUBJECTS] Authenticated user: ${user.email} (ID: ${user.id})`);

        let subjects: any[] = [];
        let courses: any[] = [];
        let courseTitle = 'All Subjects';

        // 1. Fetch courses the user is enrolled in
        const userEnrollments = await prisma.userEnrollment.findMany({
            where: {
                user_id: Number(user.id),
                status: 'active'
            },
            include: {
                course: {
                    include: {
                        subjects: {
                            where: { is_active: true },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        courses = userEnrollments.map(e => ({
            id: e.course.id,
            title: e.course.title,
            is_free: e.course.is_free,
            is_paid: e.is_paid,
            subjectIds: e.course.subjects.map(s => s.id)
        }));

        if (enrolledOnly) {
            console.log(`[DEBUG-MOBILE-SUBJECTS] Fetching subjects via user enrollments...`);
            // Fetch projects/boards/programs info for subjects as well
            subjects = await prisma.subject.findMany({
                where: {
                    is_active: true,
                    courses: {
                        some: {
                            enrollments: {
                                some: {
                                    user_id: Number(user.id),
                                    status: 'active'
                                }
                            }
                        }
                    }
                },
                include: {
                    program: {
                        select: {
                            exam_category: true
                        }
                    },
                    courses: {
                        where: {
                            enrollments: {
                                some: {
                                    user_id: Number(user.id),
                                    status: 'active'
                                }
                            }
                        },
                        select: { id: true }
                    },
                    _count: {
                        select: { chapters: true }
                    }
                }
            });
            courseTitle = 'Enrolled Subjects';
        } else if (courseId) {
            console.log(`[DEBUG-MOBILE-SUBJECTS] Fetching subjects for specific courseId: ${courseId}`);
            const course = await prisma.course.findUnique({
                where: { id: parseInt(courseId) },
                include: {
                    subjects: {
                        where: { is_active: true },
                        orderBy: { name: 'asc' },
                        include: {
                            program: {
                                select: {
                                    exam_category: true
                                }
                            },
                            courses: {
                                where: {
                                    enrollments: {
                                        some: {
                                            user_id: Number(user.id),
                                            status: 'active'
                                        }
                                    }
                                },
                                select: { id: true }
                            },
                            _count: {
                                select: { chapters: true }
                            }
                        }
                    }
                }
            });

            if (course) {
                subjects = course.subjects;
                courseTitle = course.title;
            } else {
                console.log(`[DEBUG-MOBILE-SUBJECTS] Course ${courseId} not found`);
            }
        } else {
            console.log(`[DEBUG-MOBILE-SUBJECTS] Fetching ALL active subjects...`);
            subjects = await prisma.subject.findMany({
                where: { is_active: true },
                orderBy: { name: 'asc' },
                include: {
                    program: {
                        select: {
                            exam_category: true
                        }
                    },
                    courses: {
                        where: {
                            enrollments: {
                                some: {
                                    user_id: Number(user.id),
                                    status: 'active'
                                }
                            }
                        },
                        select: { id: true }
                    },
                    _count: {
                        select: { chapters: true }
                    }
                }
            });
        }

        console.log(`[DEBUG-MOBILE-SUBJECTS] Found ${subjects.length} subjects`);
        console.log(`[DEBUG-MOBILE-SUBJECTS] Found ${courses.length} courses:`, courses.map(c => ({ id: c.id, title: c.title })));
        console.log(`[DEBUG-MOBILE-SUBJECTS] User enrollments count: ${userEnrollments.length}`);

        const formattedSubjects = subjects.map(s => ({
            id: s.id,
            name: s.name,
            description: null,
            is_active: s.is_active,
            quizzes_enabled: s.quizzes_enabled,
            examCategory: s.program?.exam_category,
            courseIds: s.courses.map((c: any) => c.id),
            _count: s._count,
            mastery: 0,
        }));

        return NextResponse.json({
            subjects: formattedSubjects,
            courses: courses,
            courseTitle: courseTitle
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-SUBJECTS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch subjects" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
