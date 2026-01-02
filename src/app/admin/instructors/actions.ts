"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getInstructors() {
    return await db.instructor.findMany({
        include: {
            user: true,
            _count: {
                select: {
                    courses: true,
                },
            },
        },
        orderBy: {
            created_at: "desc",
        },
    });
}

export async function getInstructorById(id: number) {
    return await db.instructor.findUnique({
        where: { id },
        include: {
            user: true,
        },
    });
}

export async function getEligibleUsers() {
    // Users who are not already instructors
    return await db.user.findMany({
        where: {
            instructor_profile: null,
            role: {
                not: 'admin'
            }
        },
        select: {
            id: true,
            username: true,
            email: true,
        },
    });
}

export async function upsertInstructor(data: {
    id?: number;
    userId: number;
    bio?: string;
    avatar_url?: string;
    title?: string;
    social_links?: any;
}) {
    const { id, userId, ...instructorData } = data;

    if (id) {
        await db.instructor.update({
            where: { id },
            data: instructorData,
        });
    } else {
        // Create instructor and update user role
        // We use string literals for roles to avoid import issues with generated types
        await db.$transaction([
            db.instructor.create({
                data: {
                    user_id: userId,
                    ...instructorData,
                },
            }),
            db.user.update({
                where: { id: userId },
                data: { role: 'instructor' as any },
            }),
        ]);
    }

    revalidatePath("/admin/instructors");
    return { success: true };
}

export async function deleteInstructor(id: number) {
    const instructor = await db.instructor.findUnique({
        where: { id },
        select: { user_id: true },
    });

    if (instructor) {
        await db.$transaction([
            db.user.update({
                where: { id: instructor.user_id },
                data: { role: 'student' as any }, // Reset to student
            }),
            db.instructor.delete({
                where: { id },
            }),
        ]);
    }

    revalidatePath("/admin/instructors");
    return { success: true };
}
