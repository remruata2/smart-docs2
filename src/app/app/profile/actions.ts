"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfileInstitution(institutionId: string | null) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const userId = parseInt(session.user.id as string);

    try {
        const latest = await prisma.userEnrollment.findFirst({
            where: { user_id: userId, status: "active" },
            orderBy: { last_accessed_at: "desc" }
        });

        if (latest) {
            await prisma.userEnrollment.update({
                where: { id: latest.id },
                data: {
                    institution_id: institutionId ? BigInt(institutionId) : null,
                }
            });
        }

        revalidatePath("/app/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to update institution:", error);
        throw new Error("Failed to update institution");
    }
}
