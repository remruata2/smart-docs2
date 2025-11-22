"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getUserProfile() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // Fetch user profile with program, institution, and board details
    const profile = await prisma.profile.findUnique({
        where: { user_id: userId },
        include: {
            program: {
                include: {
                    board: {
                        include: {
                            country: true,
                        },
                    },
                    subjects: {
                        where: { is_active: true },
                        include: {
                            chapters: {
                                where: { is_active: true },
                            },
                        },
                    },
                },
            },
            institution: true,
        },
    });

    if (!profile) {
        return null;
    }

    // Calculate stats
    const subjectCount = profile.program?.subjects?.length || 0;
    const chapterCount = profile.program?.subjects?.reduce(
        (acc: number, subject: any) => acc + (subject.chapters?.length || 0),
        0
    ) || 0;

    const conversationCount = await prisma.conversation.count({
        where: { user_id: userId },
    });

    return {
        profile,
        stats: {
            subjectCount,
            chapterCount,
            conversationCount,
        },
    };
}
