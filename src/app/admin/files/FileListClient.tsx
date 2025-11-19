"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
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
import { Eye, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { deleteFileAction } from "./actions";
import { cardContainer } from "@/styles/ui-classes";
import { format } from "date-fns";
import type { FileListEntry, FileFilterOptions } from './actions';

interface FileListClientProps {
  initialItems: FileListEntry[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  filterOptions?: Partial<FileFilterOptions>;
  initialError?: string | null;
  canDelete?: boolean;
}

export default function FileListClient({
  initialItems,
  initialTotal,
  initialPage,
  initialPageSize,
  filterOptions = {},
  initialError,
  canDelete = false,
}: FileListClientProps) {
  // Provide default empty arrays for all filter options
  const {
    categories = [],
    years = []
  } = filterOptions;
  
  const [items, setItems] = useState<FileListEntry[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [error, setError] = useState<string | null>(initialError || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<FileListEntry | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Debounced fetch
  useEffect(() => {
    setError(initialError || null);
  }, [initialError]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (selectedCategory) params.set('category', selectedCategory);
        if (selectedYear) params.set('year', selectedYear);
        
        const res = await fetch(`/api/admin/files?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        if (!active) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setPageSize(data.pageSize || pageSize);
        setError(null);
      } catch (e) {
        if (!active) return;
        setError('Failed to load files');
        setItems([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    }, 350); // debounce
    
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [page, pageSize, searchQuery, selectedCategory, selectedYear]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedYear("");
    setPage(1);
  };

  const searchParams = useMemo(() => ({
    q: searchQuery,
    category: selectedCategory,
    year: selectedYear,
  }), [searchQuery, selectedCategory, selectedYear]);

  const hasActiveFilters = searchQuery || selectedCategory || selectedYear;

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setLoading(true);
    try {
      const result = await deleteFileAction(itemToDelete.id);
      if (result.success) {
        setItems((prev) => prev.filter((f) => f.id !== itemToDelete.id));
        setTotal((t) => Math.max(0, t - 1));
        toast.success(result.message || "File deleted successfully!");
      } else {
        toast.error(result.error || "Failed to delete file.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
      console.error(err);
    }
    setLoading(false);
    setItemToDelete(null);
  };

  if (loading && !itemToDelete) setLoading(false);

  if (error && !loading) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className={cardContainer}>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

        {/* Filters Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>



            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

      {/* Table Section */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {item.title || 'Untitled'}
                    </TableCell>
                    <TableCell>
                      {item.entry_date_real ? format(new Date(item.entry_date_real), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/admin/files/${item.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/files/${item.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No files found
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing {items.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(page * pageSize, total)} of {total} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total || loading}
              >
                Next
              </Button>
            </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file and its contents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}