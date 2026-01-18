"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";

const ExamSchema = z.object({
    code: z.string().min(1, "Code is required").max(50),
    name: z.string().min(1, "Name is required").max(255),
    short_name: z.string().max(100).optional(),
    description: z.string().optional(),
    exam_type: z.enum(["board", "entrance", "competitive", "professional", "university"]).default("board"),
    parent_id: z.string().optional(),
    is_active: z.string().optional(), // Checkbox sends "on" or undefined
    display_order: z.string().optional(),
});

export async function createExam(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const rawData = Object.fromEntries(formData.entries());
    const validated = ExamSchema.safeParse(rawData);

    if (!validated.success) {
        throw new Error(JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { code, name, short_name, description, exam_type, parent_id, is_active, display_order } = validated.data;

    // Ensure code is uppercase and unique
    const normalizedCode = code.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    // Check if code already exists
    const existing = await prisma.exam.findUnique({ where: { code: normalizedCode } });
    if (existing) {
        throw new Error("An exam with this code already exists");
    }

    await prisma.exam.create({
        data: {
            code: normalizedCode,
            name,
            short_name: short_name || null,
            description: description || null,
            exam_type,
            parent_id: parent_id || null,
            is_active: is_active === "on",
            display_order: display_order ? parseInt(display_order) : 0,
        },
    });

    revalidatePath("/admin/exams");
    redirect("/admin/exams");
}

export async function updateExam(id: string, formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const rawData = Object.fromEntries(formData.entries());
    const validated = ExamSchema.safeParse(rawData);

    if (!validated.success) {
        throw new Error(JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { code, name, short_name, description, exam_type, parent_id, is_active, display_order } = validated.data;

    // Ensure code is uppercase and unique
    const normalizedCode = code.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    // Check if code already exists for a different exam
    const existing = await prisma.exam.findFirst({
        where: {
            code: normalizedCode,
            NOT: { id }
        }
    });
    if (existing) {
        throw new Error("An exam with this code already exists");
    }

    await prisma.exam.update({
        where: { id },
        data: {
            code: normalizedCode,
            name,
            short_name: short_name || null,
            description: description || null,
            exam_type,
            parent_id: parent_id || null,
            is_active: is_active === "on",
            display_order: display_order ? parseInt(display_order) : 0,
        },
    });

    revalidatePath("/admin/exams");
    redirect("/admin/exams");
}

export async function deleteExam(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    // Check if exam is used by any subject, syllabus, or textbook
    const usageCount = await prisma.$transaction([
        prisma.subject.count({ where: { exam_id: id } }),
        prisma.syllabus.count({ where: { exam_id: id } }),
        prisma.textbook.count({ where: { exam_id: id } }),
    ]);

    const totalUsage = usageCount.reduce((a, b) => a + b, 0);
    if (totalUsage > 0) {
        throw new Error(`Cannot delete: This exam is used by ${totalUsage} items (subjects, syllabi, or textbooks)`);
    }

    await prisma.exam.delete({
        where: { id },
    });

    revalidatePath("/admin/exams");
}

// Get all exams for dropdowns
export async function getExams() {
    return prisma.exam.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        select: {
            id: true,
            code: true,
            name: true,
            short_name: true,
            exam_type: true,
            parent_id: true,
        }
    });
}
