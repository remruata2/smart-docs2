import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authenticate
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Supabase Admin not initialized" }, { status: 500 });
        }
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const { id } = await params;
        const chapterId = BigInt(id);

        // 2. Fetch Chapter
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                subject: {
                    include: {
                        program: true
                    }
                },
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        // 3. Fetch StudyMaterial (same as web version)
        const studyMaterial = await prisma.studyMaterial.findUnique({
            where: { chapter_id: chapterId },
        });

        // 4. Extract textbook content from chapter.content_json
        const contentJson = chapter.content_json as any || {};
        const textbookContent = contentJson.text || contentJson.markdown || contentJson.content || null;

        // 5. Build materials response (matching web structure)
        const summary = studyMaterial?.summary as any || null;

        // Prioritize manual key points
        const manualPoints = chapter.key_points ? chapter.key_points.split('\n').filter((p: string) => p.trim()) : [];
        const aiPoints = summary?.key_points || [];
        // const keyPoints = manualPoints.length > 0 ? manualPoints : aiPoints;
        const keyPoints = manualPoints;

        const materials = {
            // Summary tab
            summary: summary ? {
                ...summary,
                brief: summary.brief || null,
                key_points: keyPoints,
                important_formulas: summary.important_formulas || [],
            } : {
                brief: null,
                key_points: keyPoints,
                important_formulas: [],
            },
            // Key Terms tab (definitions)
            key_terms: studyMaterial?.definitions || [],
            // Flashcards tab
            flashcards: (studyMaterial?.flashcards as any[]) || [],
            // Videos tab
            curated_videos: (studyMaterial?.curated_videos as any[]) || [],
            // Textbook tab
            content: textbookContent,
            // Mind map (bonus)
            mind_map: studyMaterial?.mind_map || null,
        };

        // 6. Serialize BigInt
        const serializeWithBigInt = (obj: any): any => {
            return JSON.parse(
                JSON.stringify(obj, (_, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                )
            );
        };

        const safeChapter = serializeWithBigInt({
            id: chapter.id,
            title: chapter.title,
            subject: chapter.subject,
            pdf_url: chapter.pdf_url,
            is_mbse: chapter.subject.program.board_id === "MBSE", // Helper flag for client
        });

        return NextResponse.json({
            success: true,
            chapter: safeChapter,
            materials,
        });

    } catch (error) {
        console.error("[MOBILE CONTENT] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
