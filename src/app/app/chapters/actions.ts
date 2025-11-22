"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getChaptersForSubject(subjectId: number) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // Fetch user profile to verify program access
    const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        include: {
            program: {
                include: {
                    board: true,
                },
            },
        },
    });

    if (!profile?.program_id) {
        return null;
    }

    // Fetch subject and verify it belongs to user's program
    const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        include: {
            program: true,
        },
    });

    // Security check: ensure subject belongs to user's program
    if (!subject || subject.program_id !== profile.program_id) {
        return null;
    }

    // Fetch chapters for this subject
    // Filter by board access (is_global OR board in accessible_boards)
    const chapters = await prisma.chapter.findMany({
        where: {
            subject_id: subjectId,
            is_active: true,
            OR: [
                { is_global: true },
                { accessible_boards: { has: profile.program.board_id } },
            ],
        },
        include: {
            _count: {
                select: {
                    chunks: true,
                    pages: true,
                },
            },
        },
        orderBy: [
            { chapter_number: "asc" },
            { title: "asc" },
        ],
    });

    return {
        chapters,
        subjectInfo: {
            subject,
            program: profile.program!,
            board: profile.program!.board,
        },
    };
}

export async function getChapterById(chapterId: string) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // Fetch user profile
    const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        include: {
            program: {
                include: {
                    board: true,
                },
            },
        },
    });

    if (!profile?.program_id) {
        return null;
    }

    // Fetch chapter with subject and verify access
    const chapter = await prisma.chapter.findUnique({
        where: { id: BigInt(chapterId) },
        include: {
            subject: {
                include: {
                    program: true,
                },
            },
            pages: {
                orderBy: {
                    page_number: "asc",
                },
            },
        },
    });

    // Security checks
    if (!chapter) {
        return null;
    }

    // Verify chapter's subject belongs to user's program
    if (chapter.subject.program_id !== profile.program_id) {
        return null;
    }

    // Verify board access
    const hasAccess =
        chapter.is_global ||
        chapter.accessible_boards.includes(profile.program.board_id);

    if (!hasAccess) {
        return null;
    }

    return {
        chapter,
        subjectInfo: {
            subject: chapter.subject,
            program: profile.program!,
            board: profile.program!.board,
        },
    };
}
