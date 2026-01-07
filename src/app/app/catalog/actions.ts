"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";

export async function getCatalogData() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const userId = parseInt(session.user.id as string);

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
            enrollments: {
                where: {
                    user_id: userId,
                },
                select: {
                    id: true,
                }
            }
        },
        orderBy: {
            created_at: "desc",
        }
    });

    // Get categories/streams (can be inferred from subjects or added to Course)
    // For now, let's keep it simple
    return {
        courses: courses.map(c => ({
            ...c,
            price: c.price?.toString() || null,
            created_at: c.created_at.toISOString(),
            updated_at: c.updated_at.toISOString(),
            isEnrolled: c.enrollments.length > 0
        }))
    };
}

export async function enrollInCourse(courseId: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = parseInt(session.user.id as string);

    try {
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

        revalidatePath("/app/catalog");
        revalidatePath("/app/dashboard");
        revalidatePath("/app/subjects");

        return { success: true };
    } catch (error) {
        console.error("Enrollment error:", error);
        throw new Error("Failed to enroll");
    }
}
