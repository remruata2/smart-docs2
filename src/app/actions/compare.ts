"use server";

import { compareDocuments } from "@/lib/comparison-service";
import { prisma } from "@/lib/prisma";

export async function compareFilesAction(fileIdA: number, fileIdB: number) {
    try {
        const result = await compareDocuments(fileIdA, fileIdB);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Comparison failed:", error);
        return { success: false, error: error.message };
    }
}

export async function getPageLayout(fileId: number, pageNumber: number) {
    try {
        const chunks = await prisma.fileChunk.findMany({
            where: {
                file_id: fileId,
                page_number: pageNumber
            },
            select: {
                content: true,
                bbox: true
            }
        });

        const layoutItems = chunks.map(chunk => ({
            text: chunk.content,
            bbox: chunk.bbox as number[] // Assuming bbox is stored as JSON array
        }));

        return { success: true, data: layoutItems };
    } catch (error: any) {
        console.error("Failed to fetch layout:", error);
        return { success: false, error: error.message };
    }
}
