"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const BadgeSchema = z.object({
    name: z.string().min(1, "Name is required"),
    icon: z.string().min(1, "Icon is required"),
    min_streak: z.string().transform((val) => parseInt(val, 10)).refine((val) => val > 0, "Must be positive"),
    is_active: z.string().optional(),
});

export async function createBadge(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    const validated = BadgeSchema.safeParse(rawData);

    if (!validated.success) {
        throw new Error(JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { name, icon, min_streak, is_active } = validated.data;

    await prisma.streakBadge.create({
        data: {
            name,
            icon,
            min_streak,
            is_active: is_active === "on",
        },
    });

    revalidatePath("/admin/badges");
    redirect("/admin/badges");
}

export async function deleteBadge(id: string) {
    await prisma.streakBadge.delete({
        where: { id },
    });

    revalidatePath("/admin/badges");
}
