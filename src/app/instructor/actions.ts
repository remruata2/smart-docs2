"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { updateUser as updateUserService } from "@/services/user-service";
import { revalidatePath } from "next/cache";

export async function updateSelfAction(data: {
    name: string;
    image?: string;
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = parseInt(session.user.id);

    try {
        await updateUserService(userId, {
            name: data.name,
            image: data.image,
        });

        revalidatePath("/instructor/settings");
        revalidatePath("/instructor/dashboard");

        return { success: true };
    } catch (error: any) {
        console.error("Failed to update self profile:", error);
        return { success: false, error: error.message || "Failed to update profile. Please try again." };
    }
}

async function getInstructor() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    return await db.instructor.findUnique({
        where: { user_id: parseInt(session.user.id as string) },
    });
}

export async function getInstructorStats() {
    const instructor = await getInstructor();
    if (!instructor) return null;

    const courses = await db.course.findMany({
        where: { instructor_id: instructor.id },
        include: {
            _count: {
                select: { enrollments: true }
            }
        }
    });

    const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
    const publishedCourses = courses.filter(c => c.is_published).length;

    return {
        totalCourses: courses.length,
        publishedCourses,
        totalStudents,
        instructorName: instructor.title || "Instructor",
    };
}

export async function getInstructorCourses() {
    const instructor = await getInstructor();
    if (!instructor) return [];

    return await db.course.findMany({
        where: { instructor_id: instructor.id },
        include: {
            board: true,
            _count: {
                select: { enrollments: true }
            }
        },
        orderBy: { created_at: 'desc' }
    });
}

export async function getInstructorEnrollments() {
    const instructor = await getInstructor();
    if (!instructor) return [];

    return await db.userEnrollment.findMany({
        where: {
            course: {
                instructor_id: instructor.id
            }
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                }
            },
            course: {
                select: {
                    id: true,
                    title: true,
                }
            }
        },
        orderBy: { enrolled_at: 'desc' },
        take: 50
    });
}
