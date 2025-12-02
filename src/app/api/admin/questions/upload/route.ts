import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { extractQuestionsFromPaper, generateAnswerForQuestion, generateAnswersForBatch } from "@/lib/ai-service-enhanced";
import { LlamaParseDocumentParser } from "@/lib/llamaparse-document-parser";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const subjectId = formData.get("subjectId") as string;
        const chapterId = formData.get("chapterId") as string;

        if (!file || !subjectId || !chapterId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Save file temporarily
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${file.name}`);
        await writeFile(tempFilePath, buffer);

        try {
            // 2. Parse PDF with LlamaParse (using shared parser)
            console.log("[UPLOAD] Parsing PDF with LlamaParse...");
            const parser = new LlamaParseDocumentParser();
            const pages = await parser.parseFile(tempFilePath, {
                fastMode: false, // Use Premium mode for better layout/diagram extraction
                parsingInstruction: "Extract questions and diagrams. Ignore Hindi text."
            });

            const pdfMarkdown = pages.map((p: any) => p.md || p.text).join("\n\n");

            if (!pdfMarkdown || pdfMarkdown.trim().length === 0) {
                throw new Error("Parsed PDF content is empty");
            }

            // 3. Extract Questions
            console.log("[UPLOAD] Extracting questions...");
            const extractedQuestions = await extractQuestionsFromPaper(pdfMarkdown);

            // 4. Fetch Chapter Content for Context
            console.log("[UPLOAD] Fetching chapter context...");
            const chapterContent = await prisma.chapterChunk.findMany({
                where: { chapter_id: parseInt(chapterId) },
                select: { content: true },
                take: 20 // Limit chunks to avoid token overflow, or use RAG later if needed
            });
            const contextText = chapterContent.map(c => c.content).join("\n\n");

            // 5. Skip Answer Generation (User requested separate step)
            console.log(`[UPLOAD] Extracted ${extractedQuestions.length} questions. Returning for review...`);

            // Return questions with empty answers for now
            const processedQuestions = extractedQuestions.map((q: any) => ({
                ...q,
                correct_answer: "",
                explanation: "",
                chapter_id: parseInt(chapterId),
                subject_id: parseInt(subjectId)
            }));

            return NextResponse.json({
                success: true,
                questions: processedQuestions
            });

        } finally {
            // Cleanup temp file
            await unlink(tempFilePath).catch(console.error);
        }

    } catch (error: any) {
        console.error("[UPLOAD] Error processing upload:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process upload" },
            { status: 500 }
        );
    }
}
