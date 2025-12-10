import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateAnswersForBatch } from "@/lib/ai-service-enhanced";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.role || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { questions, chapterId } = await req.json();

        if (!questions || !Array.isArray(questions) || questions.length === 0 || !chapterId) {
            return NextResponse.json({ error: "Missing questions or chapterId" }, { status: 400 });
        }

        console.log(`[GEN-ANSWERS] Generating answers for ${questions.length} questions (Chapter ${chapterId})...`);

        // 1. Fetch Chapter Context & Metadata
        const chapterData = await prisma.chapter.findUnique({
            where: { id: BigInt(chapterId) },
            include: {
                subject: {
                    include: {
                        program: {
                            include: {
                                board: true
                            }
                        }
                    }
                },
                chunks: {
                    orderBy: { chunk_index: 'asc' },
                    select: { content: true }
                }
            }
        });

        if (!chapterData) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        const contextText = chapterData.chunks.map(c => c.content).join("\n\n");
        if (!contextText) {
            console.warn("[GEN-ANSWERS] No chapter content found. AI will rely on general knowledge.");
        }

        const boardName = chapterData.subject?.program?.board?.id || ""; // e.g. "CBSE"
        const levelName = chapterData.subject?.program?.name || ""; // e.g. "Class 10"
        const subjectName = chapterData.subject?.name || "";
        const chapterName = chapterData.title || "";

        // 2. Generate Answers (Batch Mode)
        let answers: any[] = [];
        const BATCH_SIZE = 5;
        const CONCURRENCY_LIMIT = 3;

        try {
            // Split questions into chunks
            const chunks = [];
            for (let i = 0; i < questions.length; i += BATCH_SIZE) {
                chunks.push(questions.slice(i, i + BATCH_SIZE));
            }

            console.log(`[GEN-ANSWERS] Processing ${questions.length} questions in ${chunks.length} batches (Size: ${BATCH_SIZE}, Concurrency: ${CONCURRENCY_LIMIT})...`);

            // Process chunks with concurrency limit
            for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
                const activeChunks = chunks.slice(i, i + CONCURRENCY_LIMIT);

                console.log(`[GEN-ANSWERS] Processing batch set ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(chunks.length / CONCURRENCY_LIMIT)}...`);

                const batchResults = await Promise.all(
                    activeChunks.map(chunk =>
                        generateAnswersForBatch(chunk, contextText, {
                            board: boardName,
                            level: levelName,
                            subject: subjectName,
                            chapter: chapterName
                        })
                    )
                );

                // Aggregate results in order
                batchResults.forEach(batchAnswers => {
                    answers.push(...batchAnswers);
                });
            }

        } catch (err: any) {
            console.error("[GEN-ANSWERS] AI generation failed:", err);
            return NextResponse.json({ error: "AI generation failed: " + err.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            answers: answers
        });

    } catch (error: any) {
        console.error("[GEN-ANSWERS] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
