import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("board_id");
    const institutionId = searchParams.get("institution_id");

    if (!boardId) {
        return NextResponse.json({ error: "board_id is required" }, { status: 400 });
    }

    try {
        const courses = await prisma.course.findMany({
            where: {
                board_id: boardId,
                is_published: true,
                // If institutionId is provided, we should ideally filter by it if courses are linked to institutions
                // But courses currently don't have an institution_id directly.
                // However, the selected institution_id should be stored in the enrollment.
            },
            include: {
                subjects: {
                    select: { name: true }
                }
            },
            orderBy: { title: "asc" }
        });

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}
