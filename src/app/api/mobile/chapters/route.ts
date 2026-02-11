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
                is_active: true,
            },
            orderBy: {
                chapter_number: "asc",
            },
            select: {
                id: true,
                title: true,
                chapter_number: true,
                quizzes_enabled: true,
                key_points: true,
                study_materials: {
                    select: {
                        summary: true
                    }
                },
                subject: {
                    select: {
                        quizzes_enabled: true
                    }
                }
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
            chapters: chapters.map(c => {
                const manualPoints = c.key_points ? c.key_points.split('\n').filter((p: string) => p.trim()) : [];
                const topics = manualPoints;

                return {
                    id: c.id.toString(),
                    title: c.title,
                    chapter_number: c.chapter_number,
                    quizzes_enabled: c.quizzes_enabled,
                    topics: topics.slice(0, 3), // Return top 3 topics
                    subject_quizzes_enabled: c.subject?.quizzes_enabled,
                    question_counts: questionsByChapter.get(c.id.toString()) || {}
                };
            })
        });

    } catch (error: any) {
        console.error("[DEBUG-MOBILE-CHAPTERS] ERROR:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to fetch chapters" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
