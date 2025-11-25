"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const ExamSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
    program_id: z.string().optional(), // Received as string from form
    is_active: z.string().optional(), // Checkbox sends "on" or undefined
});

export async function createExam(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validated = ExamSchema.safeParse(rawData);

    if (!validated.success) {
        throw new Error(JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { title, description, date, program_id, is_active } = validated.data;

    await prisma.exam.create({
        data: {
            title,
            description,
            date: new Date(date),
            program_id: program_id ? parseInt(program_id) : null,
            is_active: is_active === "on",
        },
    });

    revalidatePath("/admin/exams");
    redirect("/admin/exams");
}

export async function updateExam(id: string, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validated = ExamSchema.safeParse(rawData);

    if (!validated.success) {
        throw new Error(JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { title, description, date, program_id, is_active } = validated.data;

    await prisma.exam.update({
        where: { id },
        data: {
            title,
            description,
            date: new Date(date),
            program_id: program_id ? parseInt(program_id) : null,
            is_active: is_active === "on",
        },
    });

    revalidatePath("/admin/exams");
    redirect("/admin/exams");
}

export async function deleteExam(id: string) {
    await prisma.exam.delete({
        where: { id },
    });

    revalidatePath("/admin/exams");
}
