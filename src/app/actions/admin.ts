'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";

// --- Board Actions ---

export async function createBoard(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const countryId = formData.get("countryId") as string;
    const state = formData.get("state") as string;
    const hideTextbook = formData.get("hideTextbook") === "on";

    if (!id || !name || !countryId) {
        return { success: false, error: "Missing required fields" };
    }

    try {
        await prisma.board.create({
            data: {
                id,
                name,
                country_id: countryId,
                state: state || null,
                hide_textbook: hideTextbook,
            },
        });
        revalidatePath("/admin/boards");
        return { success: true };
    } catch (error) {
        console.error("Error creating board:", error);
        return { success: false, error: "Failed to create board" };
    }
}

export async function updateBoard(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const countryId = formData.get("countryId") as string;
    const state = formData.get("state") as string;
    const hideTextbook = formData.get("hideTextbook") === "on";

    if (!id || !name || !countryId) {
        return { success: false, error: "Missing required fields" };
    }

    try {
        await prisma.board.update({
            where: { id },
            data: {
                name,
                country_id: countryId,
                state: state || null,
                hide_textbook: hideTextbook,
            },
        });
        revalidatePath("/admin/boards");
        return { success: true };
    } catch (error) {
        console.error("Error updating board:", error);
        return { success: false, error: "Failed to update board" };
    }
}

export async function updateBoardStatus(boardId: string, isActive: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await prisma.board.update({
            where: { id: boardId },
            data: { is_active: isActive },
        });
        revalidatePath("/admin/boards");
        return { success: true };
    } catch (error) {
        console.error("Error updating board status:", error);
        return { success: false, error: "Failed to update board status" };
    }
}

// --- Chapter Actions ---

export async function updateChapterStatus(chapterId: number | bigint, isActive: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.chapter.update({
            where: { id: BigInt(chapterId) },
            data: { is_active: isActive },
        });
        revalidatePath("/admin/chapters");
    } catch (error) {
        console.error("Error updating chapter status:", error);
        throw error;
    }
}

import { LlamaParseDocumentParser } from "@/lib/llamaparse-document-parser";
import { SemanticVectorService } from "@/lib/semantic-vector";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
// No image imports needed anymore


// ... (imports)

export async function ingestChapter(formData: FormData) {
    // ... (auth check)
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const subjectId = formData.get("subjectId") as string;
    const chapterNumber = formData.get("chapterNumber") as string;
    const accessibleBoards = formData.getAll("accessibleBoards") as string[];

    if (!file || !title || !subjectId) {
        return { success: false, error: "Missing required fields (file, title, subjectId)" };
    }

    const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
    // Create a unique folder name for this upload's images
    const uploadId = `chapter-${Date.now()}`;
    const imagesDir = join(tmpdir(), `${uploadId}-images`);

    try {
        // ... (subject/board logic)
        const subject = await prisma.subject.findUnique({
            where: { id: parseInt(subjectId) },
            include: { program: { include: { board: true } } }
        });

        if (!subject) return { success: false, error: "Subject not found" };
        const primaryBoardId = subject.program.board.id;

        let isGlobal = false;
        let finalAccessibleBoards: string[] = [];
        if (accessibleBoards.includes("GLOBAL")) {
            isGlobal = true;
            finalAccessibleBoards = [];
        } else if (accessibleBoards.length > 0) {
            isGlobal = false;
            finalAccessibleBoards = accessibleBoards.filter(b => b !== "GLOBAL");
        } else {
            isGlobal = false;
            finalAccessibleBoards = [primaryBoardId];
        }

        // 1. Save file to temp
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(tempFilePath, buffer);

        // 2. Parse with LlamaParse
        const parser = new LlamaParseDocumentParser();
        const pages = await parser.parseFile(tempFilePath, { fastMode: false });

        // Image generation removed in favor of direct PDF viewing


        // 4. Create Chapter
        const chapter = await prisma.chapter.create({
            data: {
                title,
                subject_id: parseInt(subjectId),
                chapter_number: chapterNumber ? parseInt(chapterNumber) : null,
                content_json: pages as any,
                accessible_boards: finalAccessibleBoards,
                is_global: isGlobal,
            },
        });

        // 5. Create Chunks & Vectors
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const content = page.md || page.text || "";
            if (!content.trim()) continue;

            const embedding = await SemanticVectorService.generateEmbedding(content);

            const chunk = await prisma.chapterChunk.create({
                data: {
                    chapter_id: chapter.id,
                    chunk_index: i,
                    content: content,
                    page_number: page.page,
                    subject_id: parseInt(subjectId),
                },
            });

            await prisma.$executeRaw`
                UPDATE "chapter_chunks"
                SET semantic_vector = ${JSON.stringify(embedding)}::vector
                WHERE id = ${chunk.id}
            `;

            if (!isGlobal && finalAccessibleBoards.length > 0) {
                for (const bid of finalAccessibleBoards) {
                    await prisma.chapterChunkBoard.create({
                        data: { chunk_id: chunk.id, board_id: bid }
                    });
                }
            }
        }

        // Chapter pages (images) removed


        revalidatePath("/admin/chapters");
        return { success: true };

    } catch (error: any) {
        console.error("Error ingesting chapter:", error);
        return { success: false, error: error.message || "Failed to ingest chapter" };
    } finally {
        // Cleanup
        try {
            await unlink(tempFilePath);
            // Cleanup images dir
            const { rm } = await import("fs/promises");
            await rm(imagesDir, { recursive: true, force: true });
        } catch (e) { }
    }
}

export async function batchCreateChapters(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File; // Re-uploaded file
    const subjectId = formData.get("subjectId") as string;
    const accessibleBoards = formData.getAll("accessibleBoards") as string[];
    const chaptersJson = formData.get("chapters") as string;
    const fullPagesJson = formData.get("fullPages") as string;

    if (!subjectId || !chaptersJson || !fullPagesJson) {
        return { success: false, error: "Missing required fields" };
    }

    const tempFilePath = file ? join(tmpdir(), `batch-${Date.now()}-${file.name}`) : "";
    const uploadId = `textbook-${Date.now()}`;
    const imagesDir = join(tmpdir(), `${uploadId}-images`);

    try {
        // ... (subject/board logic)
        const subject = await prisma.subject.findUnique({
            where: { id: parseInt(subjectId) },
            include: { program: { include: { board: true } } }
        });

        if (!subject) return { success: false, error: "Subject not found" };
        const primaryBoardId = subject.program.board.id;

        let isGlobal = false;
        let finalAccessibleBoards: string[] = [];
        if (accessibleBoards.includes("GLOBAL")) {
            isGlobal = true;
            finalAccessibleBoards = [];
        } else if (accessibleBoards.length > 0) {
            isGlobal = false;
            finalAccessibleBoards = accessibleBoards.filter(b => b !== "GLOBAL");
        } else {
            isGlobal = false;
            finalAccessibleBoards = [primaryBoardId];
        }

        const detectedChapters = JSON.parse(chaptersJson);
        const fullPages = JSON.parse(fullPagesJson);

        // Image generation removed


        let successCount = 0;
        let errorCount = 0;

        for (const detectedChapter of detectedChapters) {
            try {
                const chapterPages = fullPages.filter(
                    (p: any) => p.page >= detectedChapter.startPage && p.page <= detectedChapter.endPage
                );

                const chapter = await prisma.chapter.create({
                    data: {
                        title: detectedChapter.title,
                        subject_id: parseInt(subjectId),
                        chapter_number: detectedChapter.chapterNumber,
                        content_json: chapterPages as any,
                        accessible_boards: finalAccessibleBoards,
                        is_global: isGlobal,
                    },
                });

                for (let i = 0; i < chapterPages.length; i++) {
                    const page = chapterPages[i];
                    const content = page.md || page.text || "";
                    if (!content.trim()) continue;

                    const embedding = await SemanticVectorService.generateEmbedding(content);

                    const chunk = await prisma.chapterChunk.create({
                        data: {
                            chapter_id: chapter.id,
                            chunk_index: i,
                            content: content,
                            page_number: page.page,
                            subject_id: parseInt(subjectId),
                        },
                    });

                    await prisma.$executeRaw`
                        UPDATE "chapter_chunks"
                        SET semantic_vector = ${JSON.stringify(embedding)}::vector
                        WHERE id = ${chunk.id}
                    `;

                    if (!isGlobal && finalAccessibleBoards.length > 0) {
                        for (const bid of finalAccessibleBoards) {
                            await prisma.chapterChunkBoard.create({
                                data: { chunk_id: chunk.id, board_id: bid }
                            });
                        }
                    }
                }

                // Chapter pages (images) removed


                successCount++;
            } catch (chapterError: any) {
                console.error(`Error creating chapter "${detectedChapter.title}":`, chapterError);
                errorCount++;
            }
        }

        revalidatePath("/admin/chapters");
        return {
            success: true,
            message: `Created ${successCount} chapter(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            createdCount: successCount,
            errorCount
        };
    } catch (error: any) {
        console.error("Error in batch create chapters:", error);
        return { success: false, error: error.message || "Failed to create chapters" };
    } finally {
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
                const { rm } = await import("fs/promises");
                await rm(imagesDir, { recursive: true, force: true });
            } catch (e) { }
        }
    }
}

/**
 * Analyze textbook PDF and detect chapters (server-side only)
 */
export async function analyzeTextbook(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;

    if (!file) {
        return { success: false, error: "No file provided" };
    }

    const tempFilePath = join(tmpdir(), `analyze-${Date.now()}-${file.name}`);

    try {
        // Save file to temp
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(tempFilePath, buffer);

        // Parse with LlamaParse
        const parser = new LlamaParseDocumentParser();
        const pages = await parser.parseFile(tempFilePath, { fastMode: false });

        // Return pages for client-side chapter detection
        return {
            success: true,
            pages: pages
        };
    } catch (error: any) {
        console.error("Error analyzing textbook:", error);
        return { success: false, error: error.message || "Failed to analyze textbook" };
    } finally {
        // Cleanup
        try {
            await unlink(tempFilePath);
        } catch (e) {
            // Ignore cleanup error
        }
    }
}
