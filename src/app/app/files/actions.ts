"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { SemanticVectorService } from "../../../lib/semantic-vector";
import {
	validateFileType,
	validateFileSize,
	MAX_FILE_SIZE,
} from "@/lib/file-validation";

// Upload directory configuration
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documents");

function ensureUploadDirExists() {
	if (!existsSync(UPLOAD_DIR)) {
		mkdirSync(UPLOAD_DIR, { recursive: true });
	}
}

// Pagination + filtering types
export type GetFilesParams = {
	page?: number;
	pageSize?: number;
	q?: string;
	category?: string;
	year?: number; // calendar year from entry_date_real
};

export type FileListEntry = {
	id: number;
	category: string;
	title: string;
	entry_date_real: string | null;
	created_at: string | null;
	doc1: string | null;
	parsing_status: string | null;
	parsing_error: string | null;
	parsed_at: string | null;
};

export type PaginatedFiles = {
	items: FileListEntry[];
	total: number;
	page: number;
	pageSize: number;
};

// Server-side pagination + filtering for files list
export async function getFilesPaginated(
	params: GetFilesParams = {}
): Promise<PaginatedFiles> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return { items: [], total: 0, page: 1, pageSize: 50 };
	}
	const userId = parseInt(session.user.id as string);

	const page = Math.max(1, params.page ?? 1);
	const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));

	// Build where clause
	const where: any = {
		user_id: userId,
	};

	if (params.category && params.category.trim() !== "") {
		where.category = params.category;
	}

	// Year filter -> between Jan 1 and Dec 31
	if (params.year && Number.isFinite(params.year)) {
		const y = params.year;
		const start = new Date(Date.UTC(y, 0, 1));
		const end = new Date(Date.UTC(y + 1, 0, 1));
		where.entry_date_real = {
			gte: start,
			lt: end,
		};
	}

	// Simple text search across title, category (case-insensitive)
	if (params.q && params.q.trim() !== "") {
		const q = params.q.trim();
		where.OR = [
			{ title: { contains: q, mode: "insensitive" as const } },
			{ category: { contains: q, mode: "insensitive" as const } },
		];
	}

	try {
		const [total, rows] = await Promise.all([
			prisma.fileList.count({ where }),
			prisma.fileList.findMany({
				where,
				orderBy: [{ entry_date_real: "desc" }, { id: "desc" }],
				select: {
					id: true,
					category: true,
					title: true,
					entry_date_real: true,
					created_at: true,
					doc1: true,
					parsing_status: true,
					parsing_error: true,
					parsed_at: true,
				},
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
		]);

		const items: FileListEntry[] = rows.map((file) => ({
			...file,
			entry_date_real: file.entry_date_real?.toISOString() || null,
			created_at: file.created_at?.toISOString() || null,
			parsed_at: file.parsed_at?.toISOString() || null,
		}));

		return { items, total, page, pageSize };
	} catch (error) {
		console.error("Error fetching paginated files:", error);
		console.error(
			"Error details:",
			error instanceof Error ? error.message : String(error)
		);
		console.error(
			"Error stack:",
			error instanceof Error ? error.stack : "No stack"
		);
		throw new Error(
			`Failed to fetch files: ${error instanceof Error ? error.message : String(error)
			}`
		);
	}
}

export type FileFilterOptions = {
	categories: string[];
	years: number[];
};

export async function getFilterOptions(): Promise<FileFilterOptions> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return { categories: [], years: [] };
	}
	const userId = parseInt(session.user.id as string);

	try {
		// Distinct categories via raw SQL
		const categoriesRows: Array<{ category: string | null }> =
			await prisma.$queryRaw`
      SELECT DISTINCT category
      FROM file_list
      WHERE category IS NOT NULL AND category <> '' AND user_id = ${userId}
      ORDER BY category ASC
    `;
		const categories = categoriesRows
			.map((r) => r.category)
			.filter((c): c is string => typeof c === "string" && c.trim() !== "");

		// Distinct years via raw SQL
		const yearsRows: Array<{ year: number | null }> = await prisma.$queryRaw`
      SELECT DISTINCT EXTRACT(YEAR FROM entry_date_real)::int AS year
      FROM file_list
      WHERE entry_date_real IS NOT NULL AND user_id = ${userId}
      ORDER BY year DESC
    `;
		const years = yearsRows
			.map((r) => (typeof r.year === "number" ? r.year : null))
			.filter((y): y is number => y !== null);

		return { categories, years };
	} catch (error) {
		console.error("Error fetching filter options:", error);
		return { categories: [], years: [] };
	}
}

// Comprehensive HTML to plain text conversion for AI consumption
function htmlToPlainText(html: string | null | undefined): string | null {
	if (!html) return null;

	let text = html;
	text = text.replace(/<br\s*\/?>/gi, "\n");
	text = text.replace(/<\/?(p|div)[^>]*>/gi, "\n\n");
	text = text.replace(/<li[^>]*>/gi, "\n• ");
	text = text.replace(/<\/li>/gi, "");
	text = text.replace(/<[^>]+>/g, "");

	// Decode HTML entities (simplified for brevity, can reuse full map if needed)
	text = text.replace(/&nbsp;/g, " ");
	text = text.replace(/&amp;/g, "&");
	text = text.replace(/&lt;/g, "<");
	text = text.replace(/&gt;/g, ">");
	text = text.replace(/&quot;/g, '"');

	text = text.replace(/[ \t]+/g, " ");
	text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
	text = text.replace(/^\s+|\s+$/g, "");
	text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	return text || null;
}

const imagePlaceholder = "[Image removed - please upload images separately]";

const removeImagePlaceholder = (content: string | null | undefined): string => {
	if (!content) return "";
	return content
		.replace(
			new RegExp(
				imagePlaceholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"),
				"g"
			),
			""
		)
		.trim();
};

// Zod schema for file validation
const fileSchema = z.object({
	category: z
		.string()
		.max(500, { message: "Category must be 500 characters or less" })
		.optional(), // Optional - required per-file for uploads, or for manual entry
	title: z
		.string()
		.max(500, { message: "Title must be 500 characters or less" })
		.optional(), // Optional - will be generated from filename if not provided
	note: z.string().optional(),
	entry_date: z.string().optional().nullable(),
	content_format: z.enum(["html", "markdown"]).optional(),
});

export type FileDetail = {
	id: number;
	category: string;
	title: string;
	note: string | null;
	doc1: string | null;
	entry_date: string | null;
	entry_date_real: string | null;
	created_at: string | null;
	updated_at: string | null;
	content_format?: "html" | "markdown";
};

type PrismaFileSelectResult = {
	id: number;
	category: string;
	title: string;
	note: string | null;
	content_format: string | null;
	doc1: string | null;
	entry_date: string | null;
	entry_date_real: Date | null;
	created_at: Date | null;
	updated_at: Date | null;
};

export async function getFileById(id: number): Promise<FileDetail | null> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return null;
	}
	const userId = parseInt(session.user.id as string);

	try {
		const file = await prisma.fileList.findFirst({
			where: {
				id,
				user_id: userId,
			},
			select: {
				id: true,
				category: true,
				title: true,
				note: true,
				content_format: true,
				doc1: true,
				entry_date: true,
				entry_date_real: true,
				created_at: true,
				updated_at: true,
			},
		});
		if (!file) {
			return null;
		}

		const selectedFile = file as PrismaFileSelectResult;

		return {
			id: selectedFile.id,
			category: selectedFile.category,
			title: selectedFile.title,
			note: selectedFile.note,
			content_format: selectedFile.content_format as
				| "html"
				| "markdown"
				| undefined,
			doc1: selectedFile.doc1,
			entry_date: selectedFile.entry_date,
			entry_date_real:
				selectedFile.entry_date_real?.toISOString().split("T")[0] || "",
			created_at: selectedFile.created_at?.toISOString() || null,
			updated_at: selectedFile.updated_at?.toISOString() || null,
		};
	} catch (error) {
		console.error(`Error fetching file with id ${id}:`, error);
		throw new Error("Failed to fetch file details.");
	}
}

export type ActionResponse = {
	success: boolean;
	message?: string;
	error?: string;
	fieldErrors?: Record<string, string[] | undefined>;
};

export async function createFileAction(
	formData: FormData
): Promise<ActionResponse> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return { success: false, error: "Unauthorized" };
	}
	const userId = parseInt(session.user.id as string);

	// Check usage limit before upload
	const { enforceUsageLimit, checkUsageLimit } = await import(
		"@/lib/usage-limits"
	);
	const { UsageType } = await import("@/generated/prisma");

	// First check if user has any remaining uploads
	const limitCheck = await checkUsageLimit(UsageType.file_upload, userId);
	if (!limitCheck.allowed) {
		return {
			success: false,
			error: limitCheck.reason || "Usage limit exceeded",
		};
	}

	// Enforce the limit (this will throw if limit exceeded)
	const enforceCheck = await enforceUsageLimit(UsageType.file_upload, userId);
	if (!enforceCheck.success) {
		return {
			success: false,
			error: enforceCheck.error || "Usage limit exceeded",
		};
	}

	ensureUploadDirExists();

	const file = formData.get("doc1") as File | null;
	const rawFormData = Object.fromEntries(formData.entries());
	if (file && file.size === 0) {
		delete rawFormData.doc1;
	}

	const validatedFields = fileSchema.safeParse(rawFormData);

	if (!validatedFields.success) {
		return {
			success: false,
			error: "Validation failed. Please check the fields.",
			fieldErrors: validatedFields.error.flatten().fieldErrors,
		};
	}

	let doc1Path: string | null = null;
	const finalNote = removeImagePlaceholder(validatedFields.data.note);

	if (file && file.size > 0) {
		try {
			const buffer = Buffer.from(await file.arrayBuffer());

			// SECURITY: Validate file size
			const sizeValidation = validateFileSize(buffer.length, MAX_FILE_SIZE);
			if (!sizeValidation.valid) {
				return { success: false, error: sizeValidation.error || "File too large" };
			}

			// SECURITY: Validate file type using magic bytes
			const typeValidation = await validateFileType(
				buffer,
				"documents",
				file.name
			);
			if (!typeValidation.valid) {
				return { success: false, error: typeValidation.error || "Invalid file type" };
			}

			const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

			// Generate unique filename to prevent duplicates
			let filename: string;
			let filePath: string;
			let attempts = 0;
			const maxAttempts = 10;

			do {
				const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
				filename = uniqueSuffix + "-" + sanitizedOriginalName;
				filePath = path.join(UPLOAD_DIR, filename);
				attempts++;

				// Check if file already exists
				if (existsSync(filePath)) {
					if (attempts >= maxAttempts) {
						throw new Error(
							"Unable to generate unique filename after multiple attempts"
						);
					}
					// Wait a tiny bit and try again with new timestamp
					await new Promise((resolve) => setTimeout(resolve, 1));
					continue;
				}
				break;
			} while (attempts < maxAttempts);

			await fs.writeFile(filePath, buffer);
			doc1Path = `/uploads/documents/${filename}`;
		} catch (error) {
			console.error("Error uploading file:", error);
			return { success: false, error: "File upload failed. Please try again." };
		}
	}

	// ... existing code ...
	const { note, entry_date, content_format, ...restOfData } =
		validatedFields.data;

	// Remove district if it exists (legacy field, no longer in schema)
	const { district, ...cleanRestOfData } = restOfData as any;

	const contentFormat =
		content_format ?? (file && file.size > 0 ? "markdown" : "html");

	let entryDateReal: Date | null = null;
	if (entry_date && entry_date.trim() !== "") {
		const parsedDate = new Date(entry_date);
		if (!isNaN(parsedDate.getTime())) {
			entryDateReal = parsedDate;
		}
	}

	// Generate title from filename if not provided (for file uploads)
	let fileTitle = cleanRestOfData.title;
	if (!fileTitle && file && file.size > 0) {
		// Remove extension from filename
		fileTitle = file.name.replace(/\.[^/.]+$/, "");
	}
	// For manual entry, title is required (enforced by frontend validation)

	// Category is required - should be provided per-file for uploads or in form for manual entry
	const fileCategory = cleanRestOfData.category;
	if (!fileCategory || fileCategory.trim().length === 0) {
		return {
			success: false,
			error: "Category is required",
			fieldErrors: {
				category: ["Category is required"],
			},
		};
	}

	try {
		// Determine parsing status: if file is uploaded, set to pending; otherwise completed (manual entry)
		const parsingStatus = file && file.size > 0 ? "pending" : "completed";

		// Use transaction to ensure atomicity of file creation and usage tracking
		const newFile = await prisma.$transaction(async (tx) => {
			// Create the file record with user_id (exclude district as it no longer exists)
			const createdFile = await tx.fileList.create({
				data: {
					...cleanRestOfData,
					title: fileTitle || "Untitled", // Fallback to "Untitled" if somehow still missing
					category: fileCategory, // Use the provided category
					note: finalNote,
					content_format: contentFormat,
					doc1: doc1Path,
					entry_date: entry_date,
					entry_date_real: entryDateReal,
					user_id: userId,
					parsing_status: parsingStatus,
					// If manual entry (no file), mark as parsed immediately
					parsed_at: parsingStatus === "completed" ? new Date() : null,
				},
			});

			// Update search_vector with metadata (title, category, note) - this is fine to do immediately
			await tx.$executeRaw`
        UPDATE file_list
        SET search_vector = to_tsvector('english',
          COALESCE('Title: ' || title, '') || ' | ' ||
          COALESCE('Category: ' || category, '') || ' | ' ||
          COALESCE('Content: ' || ${finalNote}, '') || ' | ' ||
          COALESCE(entry_date, '') || ' ' ||
          COALESCE(EXTRACT(YEAR FROM entry_date_real)::text, '')
        )
        WHERE id = ${createdFile.id}
      `;

			// Track file upload usage when file is created (not after parsing)
			// This must be in the transaction to ensure consistency
			// This ensures limits are enforced immediately
			try {
				const { trackUsage } = await import("@/lib/usage-tracking");
				const { UsageType } = await import("@/generated/prisma");
				await trackUsage(userId, UsageType.file_upload);
			} catch (trackingError) {
				console.error("Usage tracking failed:", trackingError);
				// Don't fail the transaction if tracking fails, but log it
			}

			return createdFile;
		});

		// For manual entries (no file), generate semantic vector immediately
		// For files with documents, semantic vectors will be generated during background parsing
		if (parsingStatus === "completed") {
			try {
				await SemanticVectorService.updateSemanticVector(newFile.id);
			} catch (vectorError) {
				console.error("Semantic vector update failed:", vectorError);
			}
		}

		revalidatePath("/app/files");
		return {
			success: true,
			message: `File created successfully.`,
		};
	} catch (error) {
		console.error("Error creating file:", error);
		return { success: false, error: "Database error: Failed to create file." };
	}
}

export async function updateFileAction(
	id: number,
	formData: FormData
): Promise<ActionResponse> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return { success: false, error: "Unauthorized" };
	}
	const userId = parseInt(session.user.id as string);

	ensureUploadDirExists();

	// 1. Extract file and validate the rest of the form data
	const file = formData.get("doc1") as File | null;
	const rawFormData = Object.fromEntries(formData.entries());
	if (file && file.size === 0) {
		delete rawFormData.doc1;
	}

	const validatedFields = fileSchema.safeParse(rawFormData);

	if (!validatedFields.success) {
		return {
			success: false,
			error: "Validation failed. Please check the fields.",
			fieldErrors: validatedFields.error.flatten().fieldErrors,
		};
	}

	// 2. Prepare data for database update
	const { note, entry_date, content_format, ...restOfData } =
		validatedFields.data;
	const finalNote = removeImagePlaceholder(note);

	const contentFormat =
		content_format ?? (file && file.size > 0 ? "markdown" : "html");

	let entryDateReal: Date | null = null;
	if (entry_date && entry_date.trim() !== "") {
		const parsedDate = new Date(entry_date);
		if (!isNaN(parsedDate.getTime())) {
			entryDateReal = parsedDate;
		}
	} else if (entry_date === "") {
		entryDateReal = null;
	}

	const prismaDataForUpdate: any = {
		...restOfData,
		note: finalNote,
		content_format: contentFormat,
		entry_date: entry_date,
		entry_date_real: entryDateReal,
	};

	// 4. Handle file upload for update
	if (file && file.size > 0) {
		try {
			const existingFileRecord = await prisma.fileList.findFirst({
				where: { id, user_id: userId },
				select: { doc1: true },
			});

			if (!existingFileRecord) {
				return { success: false, error: "File not found or unauthorized." };
			}

			if (existingFileRecord?.doc1) {
				const oldFilePathServer = path.join(
					process.cwd(),
					"public",
					existingFileRecord.doc1
				);
				if (existsSync(oldFilePathServer)) {
					try {
						await fs.unlink(oldFilePathServer);
					} catch (delError) {
						console.error(
							`Error deleting old file ${oldFilePathServer}:`,
							delError
						);
					}
				}
			}

			const buffer = Buffer.from(await file.arrayBuffer());

			// SECURITY: Validate file size
			const sizeValidation = validateFileSize(buffer.length, MAX_FILE_SIZE);
			if (!sizeValidation.valid) {
				return { success: false, error: sizeValidation.error || "File too large" };
			}

			// SECURITY: Validate file type using magic bytes
			const typeValidation = await validateFileType(
				buffer,
				"documents",
				file.name
			);
			if (!typeValidation.valid) {
				return { success: false, error: typeValidation.error || "Invalid file type" };
			}

			const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
			const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
			const filename = uniqueSuffix + "-" + sanitizedOriginalName;
			const newFilePathOnServer = path.join(UPLOAD_DIR, filename);
			await fs.writeFile(newFilePathOnServer, buffer);
			prismaDataForUpdate.doc1 = `/uploads/documents/${filename}`;
			prismaDataForUpdate.note = finalNote;
		} catch (error) {
			console.error("Error uploading file during update:", error);
			return {
				success: false,
				error: "File upload failed during update. Please try again.",
			};
		}
	}

	// 5. Update the file record in the database
	try {
		// Ensure user owns the file
		const existing = await prisma.fileList.findFirst({
			where: { id, user_id: userId },
		});

		if (!existing) {
			return { success: false, error: "File not found or unauthorized." };
		}

		await prisma.fileList.update({
			where: { id },
			data: prismaDataForUpdate,
		});

		// 6. Update the search vector with metadata
		await prisma.$executeRaw`
      UPDATE file_list
      SET search_vector = to_tsvector('english',
        COALESCE('Title: ' || title, '') || ' | ' ||
        COALESCE('Category: ' || category, '') || ' | ' ||
        COALESCE('Content: ' || ${finalNote}, '') || ' | ' ||
        COALESCE(entry_date, '') || ' ' ||
        COALESCE(EXTRACT(YEAR FROM entry_date_real)::text, '')
      )
      WHERE id = ${id}
    `;

		// 7. Generate and update semantic vector with metadata
		try {
			await SemanticVectorService.updateSemanticVector(id);
		} catch (vectorError) {
			console.error("❌ Semantic vector update failed:", vectorError);
		}

		revalidatePath("/app/files");
		revalidatePath(`/app/files/${id}/edit`);
		return {
			success: true,
			message: "File updated successfully.",
		};
	} catch (error) {
		console.error(`Error updating file ${id}:`, error);
		return { success: false, error: "Database error: Failed to update file." };
	}
}

export async function deleteFileAction(id: number): Promise<ActionResponse> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return { success: false, error: "Unauthorized" };
	}
	const userId = parseInt(session.user.id as string);

	try {
		// Ensure user owns the file
		const existing = await prisma.fileList.findFirst({
			where: { id, user_id: userId },
		});

		if (!existing) {
			return { success: false, error: "File not found or unauthorized." };
		}

		// Delete associated files before deleting the database record
		try {
			// 1. Delete page images directory: /public/files/{fileId}/
			const imagesDir = path.join(process.cwd(), "public", "files", String(id));
			if (existsSync(imagesDir)) {
				await fs.rm(imagesDir, { recursive: true, force: true });
				console.log(`[DELETE-FILE] Deleted images directory: ${imagesDir}`);
			}

			// 2. Delete the uploaded document file (doc1)
			if (existing.doc1) {
				const docPath = path.join(process.cwd(), "public", existing.doc1);
				if (existsSync(docPath)) {
					await fs.unlink(docPath);
					console.log(`[DELETE-FILE] Deleted document file: ${docPath}`);
				}
			}
		} catch (fileError) {
			console.error(
				`[DELETE-FILE] Error deleting files for file ${id}:`,
				fileError
			);
			// Continue with database deletion even if file deletion fails
		}

		// 3. Delete the database record (this will cascade delete DocumentPage and FileChunk records)
		await prisma.fileList.delete({
			where: { id },
		});

		revalidatePath("/app/files");
		return { success: true, message: "File deleted successfully." };
	} catch (error) {
		console.error("Error deleting file:", error);
		return { success: false, error: "Database error: Failed to delete file." };
	}
}

/**
 * Retry parsing for a failed file
 */
export async function retryFileParsingAction(
	fileId: number
): Promise<ActionResponse> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return { success: false, error: "Unauthorized" };
	}
	const userId = parseInt(session.user.id as string);

	try {
		// Check if file exists and belongs to user
		const file = await prisma.fileList.findFirst({
			where: {
				id: fileId,
				user_id: userId,
			},
		});

		if (!file) {
			return { success: false, error: "File not found or access denied." };
		}

		// Reset parsing status to pending
		await prisma.fileList.update({
			where: { id: fileId },
			data: {
				parsing_status: "pending",
				parsing_error: null,
			},
		});

		revalidatePath("/app/files");
		return {
			success: true,
			message:
				"File parsing queued for retry. Processing will happen in the background.",
		};
	} catch (error) {
		console.error("Error retrying file parsing:", error);
		return {
			success: false,
			error: "Database error: Failed to retry parsing.",
		};
	}
}

export interface CategoryListItem {
	id: number;
	category: string;
}

export async function getCategoryListItems(): Promise<CategoryListItem[]> {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		return [];
	}
	const userId = parseInt(session.user.id as string);

	try {
		const items = await prisma.categoryList.findMany({
			where: { user_id: userId },
			select: {
				id: true,
				category: true,
			},
			orderBy: {
				category: "asc",
			},
		});
		return items;
	} catch (error) {
		console.error("Error fetching category list items:", error);
		return [];
	}
}
