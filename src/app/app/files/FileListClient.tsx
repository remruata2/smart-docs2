"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import type { FileListEntry, FileFilterOptions } from "./actions";

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
	canDelete = true,
}: FileListClientProps) {
	const { categories = [], years = [] } = filterOptions;

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

	useEffect(() => {
		setError(initialError || null);
	}, [initialError]);

	// Function to fetch files
	const fetchFiles = useCallback(
		async (showLoading = true) => {
			if (showLoading) setLoading(true);
			try {
				const params = new URLSearchParams();
				params.set("page", String(page));
				params.set("pageSize", String(pageSize));
				if (searchQuery.trim()) params.set("q", searchQuery.trim());
				if (selectedCategory) params.set("category", selectedCategory);
				if (selectedYear) params.set("year", selectedYear);

				const res = await fetch(`/api/dashboard/files?${params.toString()}`);
				if (!res.ok) throw new Error("Failed to fetch");
				const data = await res.json();

				setItems(data.items || []);
				setTotal(data.total || 0);
				setPage(data.page || 1);
				setPageSize(data.pageSize || pageSize);
				setError(null);
			} catch (e) {
				setError("Failed to load files");
				setItems([]);
				setTotal(0);
			} finally {
				if (showLoading) setLoading(false);
			}
		},
		[page, pageSize, searchQuery, selectedCategory, selectedYear]
	);

	// Debounced fetch for filter changes
	useEffect(() => {
		let active = true;
		const handler = setTimeout(async () => {
			if (!active) return;
			await fetchFiles();
		}, 350); // debounce

		return () => {
			active = false;
			clearTimeout(handler);
		};
	}, [page, pageSize, searchQuery, selectedCategory, selectedYear]);

	// Poll for status updates if there are files with pending/processing status
	useEffect(() => {
		const hasPendingFiles = items.some(
			(item) =>
				item.parsing_status === "pending" ||
				item.parsing_status === "processing"
		);

		if (!hasPendingFiles) return; // No need to poll if all files are completed/failed

		// Poll every 10 seconds for status updates
		const statusPollInterval = setInterval(() => {
			fetchFiles(false); // Refresh without showing loading indicator
		}, 10000); // 10 seconds

		return () => {
			clearInterval(statusPollInterval);
		};
	}, [items, page, pageSize, searchQuery, selectedCategory, selectedYear]); // Re-run when items or filters change

	// Listen for file processing events from FileProcessingWorker
	useEffect(() => {
		const handleProcessingComplete = () => {
			// Refresh file list when processing completes
			fetchFiles(false);
		};

		const handleProcessingFailed = () => {
			// Refresh file list when processing fails
			fetchFiles(false);
		};

		window.addEventListener("fileProcessingComplete", handleProcessingComplete);
		window.addEventListener("fileProcessingFailed", handleProcessingFailed);

		return () => {
			window.removeEventListener(
				"fileProcessingComplete",
				handleProcessingComplete
			);
			window.removeEventListener(
				"fileProcessingFailed",
				handleProcessingFailed
			);
		};
	}, [fetchFiles]); // Use fetchFiles as dependency

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedCategory("");
		setSelectedYear("");
		setPage(1);
	};

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

	return (
		<div className={cardContainer}>
			<div className="mb-6">
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
							onChange={(e) => {
								setSelectedCategory(e.target.value);
								setPage(1);
							}}
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
							onChange={(e) => {
								setSelectedYear(e.target.value);
								setPage(1);
							}}
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
			</div>

			{error && <p className="text-red-500 mb-4">Error: {error}</p>}

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
							<TableHead>Status</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item) => (
							<TableRow key={item.id}>
								<TableCell>{item.id}</TableCell>
								<TableCell>{item.category}</TableCell>
								<TableCell className="max-w-[300px] truncate">
									{item.title || "Untitled"}
								</TableCell>
								<TableCell>
									{item.entry_date_real
										? format(new Date(item.entry_date_real), "MMM d, yyyy")
										: "-"}
								</TableCell>
								<TableCell>
									{item.created_at
										? format(new Date(item.created_at), "MMM d, yyyy")
										: "-"}
								</TableCell>
								<TableCell>
									{item.parsing_status ? (
										<span
											className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
												item.parsing_status === "completed"
													? "bg-green-100 text-green-800"
													: item.parsing_status === "processing"
													? "bg-blue-100 text-blue-800"
													: item.parsing_status === "failed"
													? "bg-red-100 text-red-800"
													: "bg-yellow-100 text-yellow-800"
											}`}
										>
											{item.parsing_status === "completed"
												? "Ready"
												: item.parsing_status === "processing"
												? "Processing"
												: item.parsing_status === "failed"
												? "Failed"
												: "Pending"}
										</span>
									) : (
										<span className="text-muted-foreground text-xs">-</span>
									)}
								</TableCell>
								<TableCell>
									<div className="flex items-center space-x-2">
										<Link href={`/app/files/${item.id}`}>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 p-0"
											>
												<Eye className="h-4 w-4" />
											</Button>
										</Link>
										<Link href={`/app/files/${item.id}/edit`}>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 p-0"
											>
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
								<TableCell
									colSpan={6}
									className="text-center py-8 text-gray-500"
								>
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
					Showing {items.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
					{Math.min(page * pageSize, total)} of {total} entries
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1 || loading}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						onClick={() => setPage((p) => p + 1)}
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
							This will permanently delete the file and its contents. This
							action cannot be undone.
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
