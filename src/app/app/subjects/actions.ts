"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function getSubjectsForUserProgram(courseId?: number) {
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

    // Fetch enrolled courses for the user
    const enrollments = await prisma.userEnrollment.findMany({
        where: {
            user_id: userId,
            status: "active",
            ...(courseId ? { course_id: courseId } : {}),
        },
        include: {
            course: {
                include: {
                    subjects: {
                        include: {
                            _count: {
                                select: {
                                    chapters: true,
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            last_accessed_at: "desc",
        },
    });

    return {
        enrollments,
        programInfo: profile?.program ? {
            program: profile.program,
            board: profile.program.board,
        } : null,
    };
}
