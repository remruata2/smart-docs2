"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getSubjectsForUserProgram() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const userId = parseInt(session.user.id as string);

    // Fetch user profile with program info
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

    // Fetch subjects for user's program
    const subjects = await prisma.subject.findMany({
        where: {
            program_id: profile.program_id,
            is_active: true,
        },
        include: {
            _count: {
                select: {
                    chapters: {
                        where: {
                            is_active: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });

    return {
        subjects,
        programInfo: {
            program: profile.program!,
            board: profile.program!.board,
        },
    };
}
