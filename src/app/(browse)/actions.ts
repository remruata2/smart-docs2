"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Get catalog data - works for both authenticated and unauthenticated users
 */
export async function getCatalogData(query?: string) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id as string) : null;

    // 1. Fetch all active boards
    const boards = await prisma.board.findMany({
        where: { is_active: true },
    });

    // 2. Fetch all published Courses
    const courses = await prisma.course.findMany({
        where: {
            is_published: true,
            ...(query ? {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } }
                ]
            } : {})
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

    // 3. Process Courses
    const coursesWithExtra = courses.map(c => ({
        ...c,
        price: c.price?.toString() || null,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        isEnrolled: userId ? (c as any).enrollments?.length > 0 : false
    }));

    // 4. Group by Board
    // Define preferred order
    const PREFERRED_ORDER = ['MPSC', 'Departmental', 'MBSE', 'CBSE', 'Banking', 'Entrance', 'UPSC'];

    const categoriesMap = new Map<string, { id: string, name: string, courses: typeof coursesWithExtra }>();

    // Initialize map with all boards
    boards.forEach(b => {
        categoriesMap.set(b.id, {
            id: b.id,
            name: b.name,
            courses: []
        });
    });

    // Distribute courses
    coursesWithExtra.forEach(course => {
        // If board exists in map, add it. If not (and not filtered out), maybe ignore or add to "Others"?
        // For now, assume seed data covers it.
        if (categoriesMap.has(course.board_id)) {
            categoriesMap.get(course.board_id)!.courses.push(course);
        } else {
            // Optional: Handle unknown boards if necessary.
            // For now we skip or let them be 'uncategorized' if we cared, but let's stick to strict boards.
        }
    });

    const allCategories = Array.from(categoriesMap.values());

    // Sort categories
    allCategories.sort((a, b) => {
        const idxA = PREFERRED_ORDER.indexOf(a.id);
        const idxB = PREFERRED_ORDER.indexOf(b.id);
        const valA = idxA === -1 ? 999 : idxA;
        const valB = PREFERRED_ORDER.indexOf(b.id) === -1 ? 999 : PREFERRED_ORDER.indexOf(b.id);

        if (valA !== valB) return valA - valB;
        return a.name.localeCompare(b.name);
    });

    const populatedCategories = allCategories.filter(c => c.courses.length > 0);
    const upcomingCategories = allCategories.filter(c => c.courses.length === 0);

    return {
        categories: populatedCategories,
        upcoming: upcomingCategories,
        isAuthenticated: !!userId,
        // Keep flat list for search fallback or legacy if needed
        allCourses: coursesWithExtra,
        courses: coursesWithExtra // Backward compatibility for (browse)/page.tsx
    };
}

/**
 * Enroll in a course - requires authentication
 */
export async function enrollInCourse(courseId: number, institutionId?: string, isPaidEnrollment: boolean = false) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        // Redirect to login with callback
        redirect(`/login?callbackUrl=/courses/${courseId}`);
    }

    const userId = parseInt(session.user.id as string);

    try {
        // Step 0: Get the program_id from the course's subjects
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                subjects: {
                    select: { program_id: true },
                    take: 1
                }
            }
        });

        const programId = course?.subjects[0]?.program_id;
        const isPaidCourse = course && !course.is_free;

        // Calculate trial end date:
        // - If explicit paid enrollment: NO trial end date (null)
        // - If free enrollment on paid course: 3 days from now
        // - If free course: null
        let trialEndsAt: Date | null = null;
        let isPaidStatus = false;

        if (isPaidEnrollment) {
            isPaidStatus = true;
            trialEndsAt = null;
        } else if (isPaidCourse) {
            // Start Trial
            isPaidStatus = false;
            trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }

        // 1. Update or Create Enrollment with context and trial info
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
                institution_id: institutionId ? BigInt(institutionId) : null,
                program_id: programId,
                is_paid: isPaidStatus,
                trial_ends_at: trialEndsAt,
            },
            update: {
                status: "active",
                institution_id: institutionId ? BigInt(institutionId) : null,
                program_id: programId,
                // Only update payment status if this IS a paid enrollment
                ...(isPaidEnrollment ? {
                    is_paid: true,
                    trial_ends_at: null,
                } : {})
            }
        });


        revalidatePath("/");
        revalidatePath("/my-courses");
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
            course: {
                ...enrollment.course,
                price: enrollment.course.price?.toString() || null,
                created_at: enrollment.course.created_at.toISOString(),
                updated_at: enrollment.course.updated_at.toISOString(),
            },
            progress: totalMastery // Reuse progress field for mastery score
        };
    }));

    return { enrollments: enrollmentsWithMastery };
}
