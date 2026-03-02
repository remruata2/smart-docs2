import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET(request: NextRequest) {
    try {
        let userId: number;
        const authHeader = request.headers.get("Authorization");

        // Mobile Auth (Bearer Token)
        if (authHeader?.startsWith("Bearer ")) {
            const user = await getMobileUser(request);
            userId = Number(user.id);
        }
        // Web Auth (Session Cookie)
        else {
            const session = await getServerSession(authOptions);
            if (!session?.user?.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            userId = Number(session.user.id);
        }

        // 3. Fetch Enrollments
        const enrollments = await prisma.userEnrollment.findMany({
            where: {
                user_id: userId,
                status: "active",
            },
            include: {
                course: {
                    include: {
                        subjects: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                last_accessed_at: "desc",
            }
        });

        // Batch-fetch completed quizzes and chapter counts for readiness calculation
        const enrolledCourseIds = enrollments.map(e => e.course.id);
        const [completedQuizzes, courseChapters] = await Promise.all([
            prisma.quiz.findMany({
                where: {
                    user_id: userId,
                    status: 'COMPLETED',
                    total_points: { gt: 0 },
                    subject: {
                        courses: { some: { id: { in: enrolledCourseIds } } }
                    }
                },
                select: {
                    score: true,
                    total_points: true,
                    chapter_id: true,
                    subject: {
                        select: {
                            id: true,
                            courses: { select: { id: true } }
                        }
                    }
                }
            }),
            // Get total chapter count per course
            prisma.course.findMany({
                where: { id: { in: enrolledCourseIds } },
                select: {
                    id: true,
                    subjects: {
                        where: { is_active: true, created_by_user_id: null },
                        select: {
                            _count: { select: { chapters: true } }
                        }
                    }
                }
            })
        ]);

        // Map courseId -> total chapters
        const courseTotalChapters = new Map<number, number>();
        courseChapters.forEach(c => {
            const total = c.subjects.reduce((sum, s) => sum + s._count.chapters, 0);
            courseTotalChapters.set(c.id, total);
        });

        // Map courseId -> quizzes
        const quizzesByCourse = new Map<number, typeof completedQuizzes>();
        completedQuizzes.forEach(q => {
            q.subject.courses.forEach(c => {
                if (enrolledCourseIds.includes(c.id)) {
                    const list = quizzesByCourse.get(c.id) || [];
                    list.push(q);
                    quizzesByCourse.set(c.id, list);
                }
            });
        });

        const formattedEnrollments = enrollments.map(enrollment => {
            const courseQuizzes = quizzesByCourse.get(enrollment.course.id) || [];

            // Canonical readiness: (quizAverage * 0.7) + (syllabusCompletion * 0.3)
            let readiness = 0;
            if (courseQuizzes.length > 0) {
                const totalScore = courseQuizzes.reduce((acc, q) =>
                    acc + (q.total_points > 0 ? (q.score / q.total_points) * 100 : 0), 0);
                const quizAverage = totalScore / courseQuizzes.length;

                const completedChapterIds = new Set(
                    courseQuizzes.map(q => q.chapter_id?.toString()).filter(Boolean)
                );
                const totalChapters = courseTotalChapters.get(enrollment.course.id) || 0;
                const syllabusCompletion = totalChapters > 0
                    ? (completedChapterIds.size / totalChapters) * 100
                    : 0;

                readiness = Math.round((quizAverage * 0.7) + (syllabusCompletion * 0.3));
            }

            return {
                id: enrollment.id,
                course: {
                    id: enrollment.course.id,
                    title: enrollment.course.title,
                    description: enrollment.course.description,
                    thumbnail_url: enrollment.course.thumbnail_url,
                    subjects: enrollment.course.subjects,
                    is_free: enrollment.course.is_free,
                    price: enrollment.course.price?.toString() || null,
                    currency: enrollment.course.currency,
                },
                progress: readiness,
                is_paid: enrollment.is_paid,
                trial_ends_at: enrollment.trial_ends_at,
                last_accessed_at: enrollment.last_accessed_at,
            };
        });

        return NextResponse.json({ enrollments: formattedEnrollments });

    } catch (error) {
        console.error("Error fetching enrollments:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
