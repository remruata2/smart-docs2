"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema for category data
const categorySchema = z.object({
    category: z.string().min(1, "Category is required").max(500, "Category must be 500 characters or less"),
});

export async function getCategories() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return [];
    }

    const userId = parseInt(session.user.id as string);

    try {
        const categories = await db.categoryList.findMany({
            where: {
                user_id: userId,
            },
            orderBy: { category: "asc" },
        });
        return categories;
    } catch (error) {
        console.error("Failed to fetch categories:", error);
        return []; // Return empty array on error
    }
}

export async function getCategoryById(id: number) {
    if (isNaN(id)) return null;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return null;
    }
    const userId = parseInt(session.user.id as string);

    try {
        const category = await db.categoryList.findFirst({
            where: {
                id,
                user_id: userId,
            },
        });
        return category;
    } catch (error) {
        console.error(`Failed to fetch category with id ${id}:`, error);
        return null;
    }
}

export async function createCategoryAction(formData: FormData): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }
    const userId = parseInt(session.user.id as string);

    const rawData = {
        category: formData.get("category") as string,
    };

    const validationResult = categorySchema.safeParse(rawData);
    if (!validationResult.success) {
        return { success: false, error: "Invalid data", fieldErrors: validationResult.error.flatten().fieldErrors };
    }

    try {
        await db.categoryList.create({
            data: {
                category: validationResult.data.category,
                user_id: userId,
            },
        });
        revalidatePath("/app/categories");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to create category:", error);
        return { success: false, error: "Failed to create category. Please try again." };
    }
}

export async function updateCategoryAction(id: number, formData: FormData): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }
    const userId = parseInt(session.user.id as string);

    if (isNaN(id)) {
        return { success: false, error: "Invalid category ID." };
    }

    const rawData = {
        category: formData.get("category") as string,
    };

    const validationResult = categorySchema.safeParse(rawData);
    if (!validationResult.success) {
        return { success: false, error: "Invalid data", fieldErrors: validationResult.error.flatten().fieldErrors };
    }

    try {
        // Ensure user owns the category
        const existing = await db.categoryList.findFirst({
            where: { id, user_id: userId },
        });

        if (!existing) {
            return { success: false, error: "Category not found or unauthorized." };
        }

        await db.categoryList.update({
            where: { id },
            data: validationResult.data,
        });
        revalidatePath("/app/categories");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update category:", error);
        return { success: false, error: "Failed to update category. Please try again." };
    }
}

export async function deleteCategoryAction(id: number): Promise<{ success: boolean; error?: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }
    const userId = parseInt(session.user.id as string);

    if (isNaN(id)) {
        return { success: false, error: "Invalid category ID." };
    }

    try {
        // Ensure user owns the category
        const existing = await db.categoryList.findFirst({
            where: { id, user_id: userId },
        });

        if (!existing) {
            return { success: false, error: "Category not found or unauthorized." };
        }

        await db.categoryList.delete({
            where: { id },
        });
        revalidatePath("/app/categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete category:", error);
        return { success: false, error: "Failed to delete category. Please try again." };
    }
}
