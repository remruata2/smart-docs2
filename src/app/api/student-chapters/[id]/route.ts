import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { clearChapterCache } from "@/lib/response-cache";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: rawId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const chapterId = BigInt(rawId);

    try {
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                subject: true,
                _count: {
                    select: { questions: true }
                },
                study_materials: true
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        // Ownership check
        if (chapter.subject.created_by_user_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({
            chapter: {
                ...chapter,
                id: chapter.id.toString(),
                subject_id: chapter.subject_id.toString(),
                hasStudyMaterial: !!chapter.study_materials,
                questionCount: chapter._count.questions
            }
        });
    } catch (error) {
        console.error("Error fetching student chapter:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: rawId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const chapterId = BigInt(rawId);

    try {
        // 1. Fetch chapter to confirm ownership and get PDF URL
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                subject: true
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        // 2. Ownership check
        if (chapter.subject.created_by_user_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3. Delete from storage if PDF exists
        if (chapter.pdf_url && supabaseAdmin) {
            const fileName = chapter.pdf_url.split('/').pop();
            if (fileName) {
                await supabaseAdmin.storage
                    .from("chapters_pdf")
                    .remove([fileName]);
            }
        }

        // 4. Delete from database (Cascades to chunks, questions, study_materials)
        await prisma.chapter.delete({
            where: { id: chapterId }
        });

        // 5. Clear cache
        await clearChapterCache(chapterId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting student chapter:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
