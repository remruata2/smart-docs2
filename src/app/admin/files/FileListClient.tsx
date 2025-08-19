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
import { FileListEntry, deleteFileAction } from "./actions";
import { cardContainer } from "@/styles/ui-classes";
import { format } from "date-fns";

interface FileListClientProps {
	initialFiles: FileListEntry[];
	initialError?: string | null;
	canDelete?: boolean;
}

export default function FileListClient({
	initialFiles,
	initialError,
	canDelete = false,
}: FileListClientProps) {
	const [files, setFiles] = useState<FileListEntry[]>(initialFiles);
	const [error, setError] = useState<string | null>(initialError || null);
	const [loading, setLoading] = useState<boolean>(false);
	const [itemToDelete, setItemToDelete] = useState<FileListEntry | null>(null);

	// Filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedYear, setSelectedYear] = useState("");

	useEffect(() => {
		setFiles(initialFiles);
	}, [initialFiles]);

	useEffect(() => {
		setError(initialError || null);
	}, [initialError]);

	// Get unique categories and years for filter dropdowns
	const { uniqueCategories, uniqueYears } = useMemo(() => {
		const categories = [...new Set(files.map((file) => file.category))]
			.filter(Boolean)
			.sort();
		const years = [
			...new Set(
				files.map((file) => {
					if (file.entry_date_real) {
						return new Date(file.entry_date_real).getFullYear().toString();
					}
					return null;
				})
			),
		]
			.filter((year): year is string => year !== null)
			.sort((a, b) => parseInt(b) - parseInt(a));

		return { uniqueCategories: categories, uniqueYears: years };
	}, [files]);

	// Filter files based on search and filter criteria
	const filteredFiles = useMemo(() => {
		return files.filter((file) => {
			const matchesSearch =
				searchQuery === "" ||
				file.file_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
				file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				file.category.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesCategory =
				selectedCategory === "" || file.category === selectedCategory;

			const matchesYear =
				selectedYear === "" ||
				(file.entry_date_real &&
					new Date(file.entry_date_real).getFullYear().toString() ===
						selectedYear);

			return matchesSearch && matchesCategory && matchesYear;
		});
	}, [files, searchQuery, selectedCategory, selectedYear]);

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedCategory("");
		setSelectedYear("");
	};

	const hasActiveFilters = searchQuery || selectedCategory || selectedYear;

	const handleDelete = async () => {
		if (!itemToDelete) return;
		setLoading(true);
		try {
			const result = await deleteFileAction(itemToDelete.id);
			if (result.success) {
				setFiles(files.filter((file) => file.id !== itemToDelete.id));
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
						onChange={(e) => setSelectedCategory(e.target.value)}
						className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Categories</option>
						{uniqueCategories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>

					{/* Year Filter */}
					<select
						value={selectedYear}
						onChange={(e) => setSelectedYear(e.target.value)}
						className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">All Years</option>
						{uniqueYears.map((year) => (
							<option key={year} value={year}>
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
						Showing {filteredFiles.length} of {files.length} files
						{hasActiveFilters && " (filtered)"}
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
			{filteredFiles.length === 0 && !loading ? (
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
							<TableHead className="w-[150px]">File No</TableHead>
							<TableHead className="w-[180px]">Category</TableHead>
							<TableHead className="w-[300px]">Title</TableHead>
							<TableHead className="w-[150px]">Entry Date</TableHead>
							<TableHead className="w-[120px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredFiles.map((file) => (
							<TableRow key={file.id}>
								<TableCell className="font-medium">{file.file_no}</TableCell>
								<TableCell
									className="max-w-[180px] truncate"
									title={file.category}
								>
									{file.category}
								</TableCell>
								<TableCell
									className="max-w-[300px] truncate"
									title={file.title}
								>
									{file.title}
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
									{itemToDelete?.file_no} - {itemToDelete?.title}
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
