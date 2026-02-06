import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    console.log(`[DEBUG-MOBILE-CHAPTERS] Incoming request: ${request.url}`);

    try {
        const { searchParams } = new URL(request.url);
        const subjectId = searchParams.get("subjectId");

        if (!subjectId) {
            return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });
        }

        const user = await getMobileUser(request);
        console.log(`[DEBUG-MOBILE-CHAPTERS] Authenticated user: ${user.email} (ID: ${user.id}) for Subject: ${subjectId}`);

        const chapters = await prisma.chapter.findMany({
            where: {
                subject_id: parseInt(subjectId),
            },
            orderBy: {
                chapter_number: "asc",
            },
            select: {
                id: true,
                title: true,
                chapter_number: true,
            }
        });

        console.log(`[DEBUG-MOBILE-CHAPTERS] Found ${chapters.length} chapters for subject ${subjectId}`);

        // Fetch question counts grouping for all these chapters
        const chapterIds = chapters.map(c => c.id);
        const questionCounts = await prisma.question.groupBy({
            by: ['chapter_id', 'question_type'],
            where: {
                chapter_id: { in: chapterIds }
            },
            _count: {
                _all: true
            }
        });

        // Map<chapterId, Record<QuestionType, number>>
        const questionsByChapter = new Map<string, Record<string, number>>();

        questionCounts.forEach(count => {
            const cId = count.chapter_id.toString();
            const type = count.question_type;
            const num = count._count._all;

            if (!questionsByChapter.has(cId)) {
                questionsByChapter.set(cId, {});
            }
            questionsByChapter.get(cId)![type] = num;
        });

        return NextResponse.json({
            chapters: chapters.map(c => ({
                ...c,
                id: c.id.toString(),
                question_counts: questionsByChapter.get(c.id.toString()) || {}
            }))
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-CHAPTERS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch chapters" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
