"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getCourses() {
    return await db.course.findMany({
        include: {
            board: true,
            instructor: {
                include: { user: true }
            },
            _count: {
                select: {
                    subjects: true,
                    enrollments: true,
                },
            },
        },
        orderBy: {
            created_at: "desc",
        },
    });
}

export async function getCourseById(id: number) {
    return await db.course.findUnique({
        where: { id },
        include: {
            subjects: true,
            instructor: true,
        },
    });
}

export async function getInstructorsForCourse() {
    return await db.instructor.findMany({
        include: {
            user: true
        }
    });
}

export async function getBoards() {
    return await db.board.findMany({
        where: { is_active: true },
    });
}

export async function getSubjectsByBoard(boardId: string) {
    return await db.subject.findMany({
        where: {
            program: {
                board_id: boardId,
            },
            is_active: true,
        },
        include: {
            program: true,
        }
    });
}

export async function upsertCourse(data: {
    id?: number;
    title: string;
    description?: string;
    thumbnail_url?: string;
    board_id: string;
    is_published: boolean;
    is_free: boolean;
    price?: number;
    currency?: string;
    instructor_id?: number;
    subjectIds: number[];
}) {
    const { id, subjectIds, ...courseData } = data;

    if (id) {
        // Update
        await db.course.update({
            where: { id },
            data: {
                ...courseData,
                subjects: {
                    set: subjectIds.map(id => ({ id })),
                },
            },
        });
    } else {
        // Create
        await db.course.create({
            data: {
                ...courseData,
                subjects: {
                    connect: subjectIds.map(id => ({ id })),
                },
            },
        });
    }

    revalidatePath("/admin/courses");
    revalidatePath("/app/catalog");
    return { success: true };
}

export async function deleteCourse(id: number) {
    await db.course.delete({
        where: { id },
    });
    revalidatePath("/admin/courses");
    return { success: true };
}
