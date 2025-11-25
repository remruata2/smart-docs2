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

        // 1. Fetch all page image URLs before deleting
        const pages = await prisma.chapterPage.findMany({
            where: {
                chapter_id: { in: ids }
            },
            select: { image_url: true }
        });

        // 2. Extract file paths from Supabase URLs for deletion
        const filePaths: string[] = [];
        for (const page of pages) {
            if (page.image_url) {
                // Extract path from URL like: https://xxx.supabase.co/storage/v1/object/public/chapter_pages/folder/file.jpg
                const match = page.image_url.match(/\/chapter_pages\/(.+)$/);
                if (match) {
                    filePaths.push(match[1]);
                }
            }
        }

        // 3. Delete images from Supabase Storage
        if (filePaths.length > 0) {
            if (!supabaseAdmin) {
                console.error("Supabase Admin not initialized, skipping image deletion");
            } else {
                const { error: storageError } = await supabaseAdmin.storage
                    .from('chapter_pages')
                    .remove(filePaths);

                if (storageError) {
                    console.error("Error deleting images from storage:", storageError);
                    // Continue with database deletion even if storage cleanup fails
                } else {
                    console.log(`Deleted ${filePaths.length} images from Supabase Storage`);
                }
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
