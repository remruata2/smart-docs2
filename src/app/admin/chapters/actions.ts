'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

        // 4. Delete chapters (cascading will handle chunks and pages in DB)
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
