import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { UserRole } from "@/generated/prisma";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategories } from "./actions";
import CategoryListClient from "./CategoryListClient"; // We'll create this next
import { Metadata } from "next";
import { pageContainer, pageTitle } from "@/styles/ui-classes";

export const metadata: Metadata = {
  title: "Manage Categories",
};

export default async function AdminCategoriesPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !session.user ||
    (session.user.role !== UserRole.admin && session.user.role !== UserRole.staff)
  ) {
    redirect("/unauthorized");
  }

  const categories = await getCategories();

  return (
    <div className={pageContainer}>
      <div className="flex justify-between items-center mb-8">
        <h1 className={pageTitle}>Manage Categories</h1>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Link href="/admin/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Category
          </Link>
        </Button>
      </div>
      <CategoryListClient
        categories={categories}
        canDelete={session.user.role === UserRole.admin}
      />
    </div>
  );
}
