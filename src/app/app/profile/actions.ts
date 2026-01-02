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
        await prisma.profile.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                institution_id: institutionId ? BigInt(institutionId) : null,
            },
            update: {
                institution_id: institutionId ? BigInt(institutionId) : null,
            }
        });

        revalidatePath("/app/profile");
        return { success: true };
    } catch (error) {
        console.error("Failed to update institution:", error);
        throw new Error("Failed to update institution");
    }
}
