"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

// Assuming a simplified slug generation for this example
function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function createCategory(data: { name: string, description: string, is_active: boolean, order: number }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        const slug = generateSlug(data.name)
        const category = await prisma.forumCategory.create({
            data: {
                ...data,
                slug
            }
        })
        return { success: true, category }
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: "A category with this name might already exist." }
        return { success: false, error: "Failed to create category." }
    }
}

export async function updateCategory(id: number, data: { name: string, description: string, is_active: boolean, order: number }) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        const slug = generateSlug(data.name)
        const category = await prisma.forumCategory.update({
            where: { id },
            data: {
                ...data,
                slug
            }
        })
        return { success: true, category }
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: "A category with this name might already exist." }
        return { success: false, error: "Failed to update category." }
    }
}

export async function deleteCategory(id: number) {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== "admin") return { success: false, error: "Unauthorized" }

    try {
        await prisma.forumCategory.delete({
            where: { id }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to delete category. It might contain topics." }
    }
}
