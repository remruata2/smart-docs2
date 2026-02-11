import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { clearChapterCache } from "@/lib/response-cache";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const user = await getMobileUser(req);
        const userId = Number(user.id);
        const chapterId = BigInt(rawId);

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
    } catch (error: any) {
        console.error("Error fetching mobile student chapter:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const user = await getMobileUser(req);
        const userId = Number(user.id);
        const chapterId = BigInt(rawId);

        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                subject: true
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        if (chapter.subject.created_by_user_id !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete from storage if PDF exists
        if (chapter.pdf_url && supabaseAdmin) {
            const fileName = chapter.pdf_url.split('/').pop();
            if (fileName) {
                await supabaseAdmin.storage
                    .from("chapters_pdf")
                    .remove([fileName]);
            }
        }

        await prisma.chapter.delete({
            where: { id: chapterId }
        });

        await clearChapterCache(chapterId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting mobile student chapter:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.message === "Unauthorized" ? 401 : 500 });
    }
}
