import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { BattleService } from "@/lib/battle-service";
import { quizService } from "@/lib/quiz-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { subjectId, chapterId, isPublic = true } = body;

        // Default to provided subject/chapter or find defaults?
        // If not provided, we should probably pick a generic one or fail.
        // For 'General' battles, we might need a default subject.
        // Let's assume input is valid or optional (if optional, maybe pick random or 'General Knowledge').

        // If IDs are missing, let's try to find a default "General" subject or ANY subject
        let targetSubjectId = subjectId;
        let targetChapterId = chapterId;

        if (!targetSubjectId) {
            const defaultSubject = await prisma.subject.findFirst();
            if (defaultSubject) targetSubjectId = defaultSubject.id;
        }

        // Generate Quiz
        // Difficulty medium, 5 questions, MCQ
        const quiz = await quizService.generateQuiz(
            userId,
            targetSubjectId,
            targetChapterId,
            "medium",
            5,
            ["MCQ"]
        );

        // Fetch names for metadata if IDs are available
        let subjectName = "";
        let chapterName = "";

        if (targetSubjectId) {
            const s = await prisma.subject.findUnique({ where: { id: targetSubjectId }, select: { name: true } });
            if (s) subjectName = s.name;
        }
        if (targetChapterId) {
            const c = await prisma.chapter.findUnique({ where: { id: BigInt(targetChapterId) }, select: { title: true } });
            if (c) chapterName = c.title;
        }

        const battle = await BattleService.createBattle(
            userId,
            quiz.id,
            subjectName,
            chapterName,
            isPublic
        );

        // Serialize BigInts
        const serializedBattle = JSON.parse(JSON.stringify(battle, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json({ success: true, battle: serializedBattle });
    } catch (error: any) {
        console.error("[MOBILE BATTLE CREATE] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create battle" },
            { status: error.message?.includes("token") ? 401 : 500 }
        );
    }
}
