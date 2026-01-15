'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { clearChapterCache } from "@/lib/response-cache";
import { generateQuestionBank } from "@/lib/question-bank-service";

export async function regenerateChapterQuizAction(chapterId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        const bigIntId = BigInt(chapterId);

        // 1. Delete all existing questions for this chapter
        await prisma.question.deleteMany({
            where: { chapter_id: bigIntId }
        });

        // 2. Trigger regeneration in background with the current halved defaults
        // These match the new DEFAULT_CONFIG in question-bank-config.tsx
        const halvedConfig = {
            easy: { MCQ: 15, TRUE_FALSE: 15, FILL_IN_BLANK: 15, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
            medium: { MCQ: 15, TRUE_FALSE: 15, FILL_IN_BLANK: 15, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
            hard: { MCQ: 10, TRUE_FALSE: 10, FILL_IN_BLANK: 10, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
        };

        // Fire and forget
        setImmediate(async () => {
            try {
                await generateQuestionBank(chapterId, halvedConfig as any);
            } catch (error) {
                console.error(`[QUIZ-REGEN] Failed for chapter ${chapterId}:`, error);
            }
        });

        revalidatePath("/admin/chapters");
        return { success: true };
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
