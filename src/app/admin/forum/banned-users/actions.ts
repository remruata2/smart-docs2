"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export async function unbanUser(userId: number) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { is_active: true }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to unban user." }
    }
}
