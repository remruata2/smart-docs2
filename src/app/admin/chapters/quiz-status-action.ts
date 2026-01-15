'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";

/**
 * Fetch quiz regeneration status for multiple chapters
 * Used for polling to show real-time status updates
 */
export async function getChaptersQuizStatus(chapterIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin((session.user as any).role)) {
        return { error: "Unauthorized" };
    }

    try {
        const bigIntIds = chapterIds.map(id => BigInt(id));

        const chapters = await prisma.chapter.findMany({
            where: { id: { in: bigIntIds } },
            select: {
                id: true,
                quiz_regen_status: true,
                _count: {
                    select: { questions: true }
                }
            }
        });

        // Convert BigInt to string for JSON serialization
        const result = chapters.map(ch => ({
            id: ch.id.toString(),
            quiz_regen_status: ch.quiz_regen_status,
            question_count: ch._count.questions
        }));

        return { chapters: result };
    } catch (error) {
        console.error("Error fetching quiz status:", error);
        return { error: "Failed to fetch status" };
    }
}
