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
        const chapterId = parseInt(id);
        if (isNaN(chapterId)) {
            return NextResponse.json({ error: "Invalid chapter ID" }, { status: 400 });
        }

        // 2. Fetch Chapter
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                subject: true,
                // chunks: true, // Optional: include chunks if needed for offline search
            }
        });

        if (!chapter) {
            return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
        }

        // 3. Check Access (TODO: Check if user's board matches accessible_boards)
        // For now, assume access is granted if authenticated

        return NextResponse.json({
            success: true,
            chapter,
        });

    } catch (error) {
        console.error("[MOBILE CONTENT] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
