"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Get catalog data - works for both authenticated and unauthenticated users
 */
export async function getCatalogData() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id as string) : null;

    // Fetch all published Courses
    const courses = await prisma.course.findMany({
        where: {
            is_published: true,
        },
        include: {
            subjects: {
                include: {
                    _count: {
                        select: {
                            chapters: true,
                        }
                    }
                }
            },
            ...(userId ? {
                enrollments: {
                    where: {
                        user_id: userId,
                    },
                    select: {
                        id: true,
                    }
                }
            } : {})
        },
        orderBy: {
            created_at: "desc",
        }
    });

    return {
        courses: courses.map(c => ({
            ...c,
            isEnrolled: userId ? (c as any).enrollments?.length > 0 : false
        })),
        isAuthenticated: !!userId
    };
}

/**
 * Enroll in a course - requires authentication
 */
export async function enrollInCourse(courseId: number, institutionId?: string) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        // Redirect to login with callback
        redirect(`/login?callbackUrl=/courses/${courseId}`);
    }

    const userId = parseInt(session.user.id as string);

    try {
        // 1. Update or Create Enrollment
        await prisma.userEnrollment.upsert({
            where: {
                user_id_course_id: {
                    user_id: userId,
                    course_id: courseId,
                }
            },
            create: {
                user_id: userId,
                course_id: courseId,
                status: "active",
                progress: 0,
            },
            update: {
                status: "active",
            }
        });

        // 2. Update Profile with Institution if provided
        if (institutionId) {
            await prisma.profile.upsert({
                where: { user_id: userId },
                create: {
                    user_id: userId,
                    institution_id: BigInt(institutionId),
                },
                update: {
                    institution_id: BigInt(institutionId),
                }
            });
        }

        revalidatePath("/");
        revalidatePath("/my-learning");
        revalidatePath("/app/catalog");
        revalidatePath("/app/subjects");

        return { success: true };
    } catch (error) {
        console.error("Enrollment error:", error);
        throw new Error("Failed to enroll");
    }
}

/**
 * Get my enrolled courses
 */
export async function getMyLearningData() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const userId = parseInt(session.user.id as string);

    const enrollments = await prisma.userEnrollment.findMany({
        where: {
            user_id: userId,
            status: "active",
        },
        include: {
            course: {
                include: {
                    subjects: {
                        include: {
                            _count: {
                                select: {
                                    chapters: true,
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            last_accessed_at: "desc",
        }
    });

    // Calculate mastery for each enrollment
    const enrollmentsWithMastery = await Promise.all(enrollments.map(async (enrollment) => {
        let totalMastery = 0;
        const subjects = enrollment.course.subjects;

        if (subjects.length > 0) {
            const subjectMasteries = await Promise.all(subjects.map(async (subject) => {
                const completedQuizzes = await prisma.quiz.findMany({
                    where: {
                        user_id: userId,
                        subject_id: subject.id,
                        status: "COMPLETED",
                        total_points: { gt: 0 }
                    },
                    select: {
                        score: true,
                        total_points: true
                    }
                });

                if (completedQuizzes.length > 0) {
                    const totalScore = completedQuizzes.reduce((sum, q) => sum + q.score, 0);
                    const totalPoints = completedQuizzes.reduce((sum, q) => sum + q.total_points, 0);
                    return (totalScore / totalPoints) * 100;
                }
                return 0;
            }));

            totalMastery = Math.round(subjectMasteries.reduce((sum, m) => sum + m, 0) / subjects.length);
        }

        return {
            ...enrollment,
            progress: totalMastery // Reuse progress field for mastery score
        };
    }));

    return { enrollments: enrollmentsWithMastery };
}
