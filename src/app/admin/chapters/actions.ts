'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { clearChapterCache } from "@/lib/response-cache";
import { generateQuestionBank } from "@/lib/question-bank-service";
import { getQuestionDefaults, QuestionBankConfigState } from "@/lib/question-bank-defaults";

export async function regenerateChapterQuizAction(chapterId: string, config?: QuestionBankConfigState) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        const bigIntId = BigInt(chapterId);

        // 1. Fetch Chapter Metadata for defaults
        const chapter = await prisma.chapter.findUnique({
            where: { id: bigIntId },
            include: {
                subject: {
                    include: {
                        program: true
                    }
                }
            }
        });

        if (!chapter) throw new Error("Chapter not found");

        // 2. Resolve Configuration
        // Use provided config, or calculate defaults based on chapter context
        const finalConfig = config || getQuestionDefaults(
            chapter.subject.program.exam_category,
            chapter.subject.name
        );

        // 3. Set status to GENERATING
        await prisma.chapter.update({
            where: { id: bigIntId },
            data: { quiz_regen_status: 'GENERATING' }
        });

        // 4. Delete all existing questions for this chapter
        const deletedCount = await prisma.question.deleteMany({
            where: { chapter_id: bigIntId }
        });

        console.log(`[QUIZ-REGEN] Deleted ${deletedCount.count} existing questions for chapter ${chapterId}`);

        // 5. Trigger regeneration in background
        setImmediate(async () => {
            try {
                await generateQuestionBank(chapterId, finalConfig as any);

                // Set status to COMPLETED
                await prisma.chapter.update({
                    where: { id: bigIntId },
                    data: { quiz_regen_status: 'COMPLETED' }
                });

                console.log(`[QUIZ-REGEN] Successfully regenerated quiz for chapter ${chapterId}`);
            } catch (error) {
                // Set status to FAILED
                await prisma.chapter.update({
                    where: { id: bigIntId },
                    data: { quiz_regen_status: 'FAILED' }
                });

                console.error(`[QUIZ-REGEN] Failed for chapter ${chapterId}:`, error);
            }
        });

        revalidatePath("/admin/chapters");
        return { success: true, deletedCount: deletedCount.count };
    } catch (error) {
        console.error("Error regenerating quiz:", error);
        throw error;
    }
}

export async function deleteChapters(chapterIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        const ids = chapterIds.map(id => BigInt(id));

        // 1. Fetch PDF URLs before deleting
        const chaptersToDelete = await prisma.chapter.findMany({
            where: { id: { in: ids } },
            select: { pdf_url: true }
        });

        // 2. Extract file paths for PDF deletion
        const pdfPaths: string[] = [];
        for (const chapter of chaptersToDelete) {
            if (chapter.pdf_url) {
                // Extract path from URL like: https://xxx.supabase.co/storage/v1/object/public/chapters_pdf/folder/file.pdf
                const match = chapter.pdf_url.match(/\/chapters_pdf\/(.+)$/);
                if (match) {
                    pdfPaths.push(match[1]);
                }
            }
        }

        // 3. Delete PDFs from Supabase Storage
        if (pdfPaths.length > 0 && supabaseAdmin) {
            const { error: storageError } = await supabaseAdmin.storage
                .from('chapters_pdf')
                .remove(pdfPaths);

            if (storageError) {
                console.error("Error deleting PDFs from storage:", storageError);
            } else {
                console.log(`Deleted ${pdfPaths.length} PDFs from Supabase Storage`);
            }
        }

        // 4. Clear cache for these chapters
        for (const id of ids) {
            await clearChapterCache(id);
        }

        // 5. Delete chapters (cascading will handle chunks and pages in DB)
        await prisma.chapter.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        revalidatePath("/admin/chapters");
    } catch (error) {
        console.error("Error deleting chapters:", error);
        throw error;
    }
}

export async function updateChapter(
    chapterId: string,
    data: {
        title: string;
        subject_id: number;
        chapter_number: number | null;
        is_active: boolean;
        is_global: boolean;
        quizzes_enabled: boolean;
        key_points?: string | null;
    }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const bigIntId = BigInt(chapterId);

        // Validate that the subject exists
        const subject = await prisma.subject.findUnique({
            where: { id: data.subject_id },
            select: { id: true, program: { select: { board_id: true } } }
        });

        if (!subject) {
            return { success: false, error: "Subject not found" };
        }

        // Update the chapter
        await prisma.chapter.update({
            where: { id: bigIntId },
            data: {
                title: data.title,
                subject_id: data.subject_id,
                chapter_number: data.chapter_number,
                is_active: data.is_active,
                is_global: data.is_global,
                quizzes_enabled: data.quizzes_enabled,
                key_points: data.key_points,
                // If not global, update accessible_boards to include the new subject's board
                accessible_boards: data.is_global ? [] : [subject.program.board_id],
            }
        });

        // If subject changed, update the chunks' subject_id too
        await prisma.chapterChunk.updateMany({
            where: { chapter_id: bigIntId },
            data: { subject_id: data.subject_id }
        });

        // Clear cache for this chapter
        await clearChapterCache(bigIntId);

        revalidatePath("/admin/chapters");
        revalidatePath(`/admin/chapters/${chapterId}`);

        return { success: true };
    } catch (error) {
        console.error("Error updating chapter:", error);
        return { success: false, error: "Failed to update chapter" };
    }
}
