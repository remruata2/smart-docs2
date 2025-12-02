import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get("subjectId");

        const where: any = { is_active: true };
        if (subjectId) {
            where.subject_id = parseInt(subjectId);
        }

        const chapters = await prisma.chapter.findMany({
            where,
            orderBy: { chapter_number: 'asc' }
        });

        // Serialize BigInt if necessary
        const serializedChapters = chapters.map(c => ({
            ...c,
            id: c.id.toString(),
            subject_id: c.subject_id.toString()
        }));

        return NextResponse.json({ chapters: serializedChapters });
    } catch (error) {
        console.error("Error fetching chapters:", error);
        return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
    }
}
