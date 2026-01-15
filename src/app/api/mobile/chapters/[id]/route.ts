import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const chapterId = id;
    console.log(`[DEBUG-MOBILE-CHAPTER] Incoming request for ID: ${chapterId}`);

    try {
        const user = await getMobileUser(request);
        console.log(`[DEBUG-MOBILE-CHAPTER] Authenticated user: ${user.email} (ID: ${user.id})`);

        const chapter = await prisma.chapter.findUnique({
            where: {
                id: parseInt(chapterId),
            },
            include: {
                subject: true,
            }
        });

        if (!chapter) {
            console.error(`[DEBUG-MOBILE-CHAPTER] Chapter not found: ${chapterId}`);
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        console.log(`[DEBUG-MOBILE-CHAPTER] Found chapter: ${chapter.title}`);

        return NextResponse.json({
            chapter: {
                ...chapter,
                id: chapter.id.toString(),
                subject_id: chapter.subject_id.toString()
            }
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-CHAPTER] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch chapter" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
