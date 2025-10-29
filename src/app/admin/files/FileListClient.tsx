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
import { Eye, Pencil, Trash2, Search, Filter, X, FileText } from "lucide-react";
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
	filterOptions: FileFilterOptions;
	initialError?: string | null;
	canDelete?: boolean;
}

export default function FileListClient({
	initialItems,
	initialTotal,
	initialPage,
	initialPageSize,
	filterOptions,
	initialError,
	canDelete = false,
}: FileListClientProps) {
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
	const [selectedDistrict, setSelectedDistrict] = useState("");
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
				if (selectedDistrict) params.set('district', selectedDistrict);
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
		}, [page, pageSize, searchQuery, selectedCategory, selectedDistrict, selectedYear]);

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedCategory("");
		setSelectedDistrict("");
		setSelectedYear("");
		setPage(1);
	};

	const hasActiveFilters = searchQuery || selectedCategory || selectedDistrict || selectedYear;

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
			{/* Search and Filter Section */}
			<div className="mb-6 space-y-4">
				<div className="flex items-center gap-4">
					<div className="relative flex-1">
						{/* Search Input */}
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
						<Input
							placeholder="Search by file number, title, or category..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>
				<div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
					{/* Category Filter */}
					<select
						value={selectedCategory}
						onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
						className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Categories</option>
						{filterOptions.categories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>

					{/* District Filter */}
					<select
						value={selectedDistrict}
						onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }}
						className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Districts</option>
						{filterOptions.districts.map((district) => (
							<option key={district} value={district}>
								{district}
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
						{filterOptions.years.map((year) => (
							<option key={year} value={String(year)}>
								{year}
							</option>
						))}
					</select>

					{/* Clear Filters Button */}
					{hasActiveFilters && (
						<Button
							variant="outline"
							onClick={clearFilters}
							className="flex items-center gap-2"
						>
							<X className="h-4 w-4" />
							Clear
						</Button>
					)}
				</div>

				{/* Results Count */}
				<div className="flex items-center justify-between text-sm text-gray-600">
					<span>
						Showing {items.length} of {total} files{hasActiveFilters && " (filtered)"}
					</span>
					{hasActiveFilters && (
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4" />
							<span>Filters active</span>
						</div>
					)}
				</div>
			</div>

			{/* Files Table */}
			{items.length === 0 && !loading ? (
				<div className="text-center py-8">
					{hasActiveFilters ? (
						<div>
							<p className="text-gray-500 mb-2">
								No files match your search criteria.
							</p>
							<Button variant="outline" onClick={clearFilters}>
								Clear filters to see all files
							</Button>
						</div>
					) : (
						<p className="text-gray-500">No files found.</p>
					)}
				</div>
			) : (
				<Table>
					<TableHeader className="bg-gray-50">
						<TableRow>
							<TableHead className="w-[150px]">File Name</TableHead>
							<TableHead className="w-[180px]">Category</TableHead>
							<TableHead className="w-[160px]">District</TableHead>
							<TableHead className="w-[150px]">Entry Date</TableHead>
							<TableHead className="w-[120px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((file) => (
							<TableRow key={file.id}>
								<TableCell
									className="max-w-[150px] truncate"
									title={file.title}
								>
									{file.title}
								</TableCell>
								<TableCell
									className="max-w-[180px] truncate"
									title={file.category}
								>
									{file.category}
								</TableCell>
								<TableCell
									className="max-w-[160px] truncate"
									title={file.district || ""}
								>
									{file.district || "N/A"}
								</TableCell>
								<TableCell>
									{file.entry_date_real
										? format(new Date(file.entry_date_real), "dd MMM yyyy")
										: "N/A"}
								</TableCell>
								<TableCell className="text-right">
									<Button variant="ghost" size="sm" asChild>
										<Link href={`/admin/files/${file.id}`}>
											<Eye className="h-4 w-4" />
											<span className="sr-only">View</span>
										</Link>
									</Button>
									{file.doc1 && (
										<Button variant="ghost" size="sm" asChild>
											<a
												href={file.doc1}
												target="_blank"
												rel="noopener noreferrer"
											>
												<FileText className="h-4 w-4" />
												<span className="sr-only">View Document</span>
											</a>
										</Button>
									)}
									<Button variant="ghost" size="sm" asChild>
										<Link href={`/admin/files/${file.id}/edit`}>
											<Pencil className="h-4 w-4" />
											<span className="sr-only">Edit</span>
										</Link>
									</Button>
									{canDelete && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setItemToDelete(file)}
										>
											<Trash2 className="h-4 w-4 text-red-500" />
											<span className="sr-only">Delete</span>
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{/* Pagination Controls */}
			<div className="mt-4 flex items-center justify-between">
				<div className="text-sm text-gray-600">
					Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
						Prev
					</Button>
					<Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / pageSize) || loading}>
						Next
					</Button>
				</div>
			</div>

			{canDelete && (
				<AlertDialog
					open={!!itemToDelete}
					onOpenChange={(open) => !open && setItemToDelete(null)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. This will permanently delete the
								file record "
								<strong>
									{itemToDelete?.title}
								</strong>
								".
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={() => setItemToDelete(null)}
								disabled={loading}
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								disabled={loading}
								className="bg-red-600 hover:bg-red-700"
							>
								{loading ? "Deleting..." : "Delete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}
