"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CategoryList } from "@/generated/prisma"; // Assuming CategoryList is the type from Prisma
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { deleteCategoryAction } from "./actions";
import { Pencil, Trash2, Search, X } from "lucide-react";
import { cardContainer } from "@/styles/ui-classes";

interface CategoryListClientProps {
  categories: CategoryList[];
  canDelete?: boolean;
}

export default function CategoryListClient({
  categories: initialCategories,
  canDelete = false,
}: CategoryListClientProps) {
  const [categories, setCategories] =
    useState<CategoryList[]>(initialCategories);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryList | null>(
    null
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Update categories if initialCategories prop changes (e.g., after revalidation)
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;

    return categories.filter(
      (category) =>
        category.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  const handleDeleteClick = (category: CategoryList) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirmation = async () => {
    if (!categoryToDelete) return;

    const result = await deleteCategoryAction(categoryToDelete.id);

    if (result.success) {
      toast.success("Category deleted successfully.");
      // Optimistically update UI or rely on revalidatePath from server action
      setCategories((prevCategories) =>
        prevCategories.filter((cat) => cat.id !== categoryToDelete.id)
      );
    } else {
      toast.error(result.error || "Failed to delete category.");
    }
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  return (
    <>
      <div className={cardContainer}>
        {/* Search Section */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by category name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Clear Search Button */}
            {searchQuery && (
              <Button
                variant="outline"
                onClick={clearSearch}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredCategories.length} of {categories.length}{" "}
            categories
            {searchQuery && " (filtered)"}
          </div>
        </div>

        {/* Categories Table */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div>
                <p className="text-gray-500 mb-2">
                  No categories match your search criteria.
                </p>
                <Button variant="outline" onClick={clearSearch}>
                  Clear search to see all categories
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">
                No categories found. Get started by adding a new one!
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.category}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="mr-2">
                      <Link
                        href={`/admin/categories/${category.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </Link>
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(category)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {canDelete && categoryToDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                category &quot;<strong>{categoryToDelete.category}</strong>&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirmation}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
