'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { deleteChapters } from "@/app/admin/chapters/actions";

// --- Institution Actions ---

export async function createInstitution(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const boardId = formData.get("boardId") as string;
    const type = formData.get("type") as string;
    const district = formData.get("district") as string;
    const state = formData.get("state") as string;

    if (!name || !boardId || !type) {
        throw new Error("Missing required fields");
    }

    try {
        await prisma.institution.create({
            data: {
                name,
                board_id: boardId,
                type,
                district: district || null,
                state: state || null,
            },
        });
        revalidatePath("/admin/institutions");
    } catch (error) {
        console.error("Error creating institution:", error);
        throw error;
    }
}

export async function updateInstitutionStatus(institutionId: bigint, isActive: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.institution.update({
            where: { id: institutionId },
            data: { is_active: isActive },
        });
        revalidatePath("/admin/institutions");
    } catch (error) {
        console.error("Error updating institution status:", error);
        throw error;
    }
}

// --- Program Actions ---

export async function createProgram(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const boardId = formData.get("boardId") as string;
    const institutionId = formData.get("institutionId") as string;
    const code = formData.get("code") as string;
    const level = formData.get("level") as string;
    const durationYears = formData.get("durationYears") as string;

    if (!name || !boardId) {
        throw new Error("Missing required fields");
    }

    try {
        await prisma.program.create({
            data: {
                name,
                board_id: boardId,
                institution_id: institutionId ? BigInt(institutionId) : null,
                code: code || null,
                level: level || null,
                duration_years: durationYears ? parseInt(durationYears) : null,
            },
        });
        revalidatePath("/admin/programs");
    } catch (error) {
        console.error("Error creating program:", error);
        throw error;
    }
}

export async function updateProgramStatus(programId: number, isActive: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.program.update({
            where: { id: programId },
            data: { is_active: isActive },
        });
        revalidatePath("/admin/programs");
    } catch (error) {
        console.error("Error updating program status:", error);
        throw error;
    }
}

// --- Subject Actions ---

export async function createSubject(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const programId = formData.get("programId") as string;
    const code = formData.get("code") as string;
    const term = formData.get("term") as string;

    if (!name || !programId) {
        throw new Error("Missing required fields");
    }

    try {
        await prisma.subject.create({
            data: {
                name,
                program_id: parseInt(programId),
                code: code || null,
                term: term || null,
            },
        });
        revalidatePath("/admin/subjects");
    } catch (error) {
        console.error("Error creating subject:", error);
        throw error;
    }
}

export async function updateSubjectStatus(subjectId: number, isActive: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.subject.update({
            where: { id: subjectId },
            data: { is_active: isActive },
        });
        revalidatePath("/admin/subjects");
    } catch (error) {
        console.error("Error updating subject status:", error);
        throw error;
    }
}
export async function deleteSubject(subjectId: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        // 1. Find all chapters for this subject
        const chapters = await prisma.chapter.findMany({
            where: { subject_id: subjectId },
            select: { id: true }
        });

        if (chapters.length > 0) {
            // 2. Delete chapters (handles storage cleanup)
            const chapterIds = chapters.map(c => c.id.toString());
            await deleteChapters(chapterIds);
        }

        // 3. Delete the subject itself
        await prisma.subject.delete({
            where: { id: subjectId }
        });

        revalidatePath("/admin/subjects");
        return { success: true };
    } catch (error) {
        console.error("Error deleting subject:", error);
        throw error;
    }
}

export async function deleteProgram(programId: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        // 1. Find all subjects for this program
        const subjects = await prisma.subject.findMany({
            where: { program_id: programId },
            select: { id: true }
        });

        // 2. Delete each subject (which handles chapter/storage cleanup)
        for (const subject of subjects) {
            await deleteSubject(subject.id);
        }

        // 3. Delete the program itself
        await prisma.program.delete({
            where: { id: programId }
        });

        revalidatePath("/admin/programs");
        return { success: true };
    } catch (error) {
        console.error("Error deleting program:", error);
        throw error;
    }
}

export async function deleteInstitution(institutionId: bigint) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.institution.delete({
            where: { id: institutionId }
        });

        revalidatePath("/admin/institutions");
        return { success: true };
    } catch (error) {
        console.error("Error deleting institution:", error);
        throw error;
    }
}

export async function deleteBoard(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        // Find all programs for this board
        const programs = await prisma.program.findMany({
            where: { board_id: id },
            select: { id: true }
        });

        // Delete each program (cascades to subjects/chapters)
        for (const program of programs) {
            await deleteProgram(program.id);
        }

        // Delete associated courses (they might have their own deletion logic, but simple delete here)
        await prisma.course.deleteMany({
            where: { board_id: id }
        });

        await prisma.board.delete({
            where: { id }
        });

        revalidatePath("/admin/boards");
        return { success: true };
    } catch (error) {
        console.error("Error deleting board:", error);
        throw error;
    }
}
