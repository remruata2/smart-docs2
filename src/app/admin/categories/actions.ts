"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";
import { UserRole } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema for category data
const categorySchema = z.object({
  file_no: z.string().min(1, "File No is required").max(100, "File No must be 100 characters or less"),
  category: z.string().min(1, "Category is required").max(500, "Category must be 500 characters or less"),
});

export async function getCategories() {
  try {
    const categories = await db.categoryList.findMany({
      orderBy: { file_no: "asc" },
    });
    return categories;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return []; // Return empty array on error
  }
}

export async function getCategoryById(id: number) {
  if (isNaN(id)) return null;
  try {
    const category = await db.categoryList.findUnique({
      where: { id },
    });
    return category;
  } catch (error) {
    console.error(`Failed to fetch category with id ${id}:`, error);
    return null;
  }
}

export async function createCategoryAction(formData: FormData): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
  ) {
    return { success: false, error: "Unauthorized" };
  }

  const rawData = {
    file_no: formData.get("file_no") as string,
    category: formData.get("category") as string,
  };

  const validationResult = categorySchema.safeParse(rawData);
  if (!validationResult.success) {
    return { success: false, error: "Invalid data", fieldErrors: validationResult.error.flatten().fieldErrors };
  }

  try {
    await db.categoryList.create({
      data: validationResult.data,
    });
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create category:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('file_no')) {
      return { success: false, error: "A category with this File No already exists." };
    }
    return { success: false, error: "Failed to create category. Please try again." };
  }
}

export async function updateCategoryAction(id: number, formData: FormData): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
  ) {
    return { success: false, error: "Unauthorized" };
  }

  if (isNaN(id)) {
    return { success: false, error: "Invalid category ID." };
  }

  const rawData = {
    file_no: formData.get("file_no") as string,
    category: formData.get("category") as string,
  };

  const validationResult = categorySchema.safeParse(rawData);
  if (!validationResult.success) {
    return { success: false, error: "Invalid data", fieldErrors: validationResult.error.flatten().fieldErrors };
  }

  try {
    await db.categoryList.update({
      where: { id },
      data: validationResult.data,
    });
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}/edit`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update category:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('file_no')) {
      return { success: false, error: "A category with this File No already exists." };
    }
    return { success: false, error: "Failed to update category. Please try again." };
  }
}

export async function deleteCategoryAction(id: number): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
  ) {
    return { success: false, error: "Unauthorized" };
  }

  if (isNaN(id)) {
    return { success: false, error: "Invalid category ID." };
  }

  try {
    await db.categoryList.delete({
      where: { id },
    });
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { success: false, error: "Failed to delete category. Please try again." };
  }
}
