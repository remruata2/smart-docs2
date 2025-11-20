import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { processFileParsing } from "@/lib/file-parsing";
import path from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

/**
 * Background processing endpoint for file parsing
 * Processes files with parsing_status = 'pending'
 * Can be called by:
 * - Cron job (external service)
 * - Client-side polling component
 * - Manual trigger (admin panel)
 */
export async function POST(req: NextRequest) {
	console.log("[PROCESS-FILE] API called");

	// Check authentication (optional - can be made public for cron jobs with API key)
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) {
		// Allow processing without auth if API key is provided (for cron jobs)
		const apiKey = req.headers.get("x-api-key");
		if (!apiKey || apiKey !== process.env.BACKGROUND_PROCESSING_API_KEY) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
	}

	try {
		// Get query parameters
		const { searchParams } = new URL(req.url);
		const limit = parseInt(searchParams.get("limit") || "1", 10); // Process 1 file at a time by default
		const fileId = searchParams.get("fileId"); // Optional: process specific file

		// Find pending files
		let pendingFiles: Array<{
			id: number;
			title: string;
			doc1: string | null;
			created_at: Date | null;
		}> = [];
		if (fileId) {
			// Process specific file
			pendingFiles = await prisma.fileList.findMany({
				where: {
					id: parseInt(fileId, 10),
					parsing_status: "pending",
				},
				take: 1,
			});
		} else {
			// Find oldest pending files (FIFO) with concurrency control
			// Use transaction to atomically claim files for processing
			// This prevents multiple workers from processing the same file
			const updateResult = await prisma.$transaction(async (tx) => {
				// Find and claim files atomically
				const filesToProcess = await tx.fileList.findMany({
					where: {
						parsing_status: "pending",
						doc1: { not: null },
					},
					orderBy: {
						created_at: "asc",
					},
					take: limit,
					select: {
						id: true,
					},
				});

				// Update status to processing for claimed files (only if still pending)
				if (filesToProcess.length > 0) {
					await tx.fileList.updateMany({
						where: {
							id: { in: filesToProcess.map((f) => f.id) },
							parsing_status: "pending", // Only update if still pending (prevents race condition)
						},
						data: {
							parsing_status: "processing",
						},
					});
				}

				return filesToProcess;
			});

			// Fetch the full file records for successfully claimed files
			if (updateResult.length > 0) {
				pendingFiles = await prisma.fileList.findMany({
					where: {
						id: { in: updateResult.map((f) => f.id) },
						parsing_status: "processing", // Only get files we successfully claimed
					},
				});
			} else {
				pendingFiles = [];
			}
		}

		if (pendingFiles.length === 0) {
			return NextResponse.json({
				success: true,
				message: "No pending files to process",
				processed: 0,
			});
		}

		console.log(
			`[PROCESS-FILE] Found ${pendingFiles.length} pending file(s) to process`
		);

		const results = [];
		const UPLOAD_DIR = path.join(
			process.cwd(),
			"public",
			"uploads",
			"documents"
		);

		for (const file of pendingFiles) {
			try {
				if (!file.doc1) {
					console.log(
						`[PROCESS-FILE] File ${file.id} has no doc1 path, skipping`
					);
					continue;
				}

				// Construct full file path
				// doc1 is stored as "/uploads/documents/filename"
				const filePath = path.join(process.cwd(), "public", file.doc1);

				if (!existsSync(filePath)) {
					console.error(`[PROCESS-FILE] File not found: ${filePath}`);
					await prisma.fileList.update({
						where: { id: file.id },
						data: {
							parsing_status: "failed",
							parsing_error: `File not found: ${filePath}`,
						},
					});
					results.push({
						fileId: file.id,
						success: false,
						error: "File not found",
					});
					continue;
				}

				console.log(`[PROCESS-FILE] Processing file ${file.id}: ${file.title}`);

				// Process the file (default to llamaparse)
				const result = await processFileParsing(
					file.id,
					filePath,
					"llamaparse"
				);

				if (result.success) {
					// Usage is already tracked when file is created in createFileAction
					// No need to track again here
					results.push({
						fileId: file.id,
						success: true,
					});
				} else {
					results.push({
						fileId: file.id,
						success: false,
						error: result.error,
					});
				}
			} catch (error) {
				console.error(
					`[PROCESS-FILE] Error processing file ${file.id}:`,
					error
				);
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";

				await prisma.fileList.update({
					where: { id: file.id },
					data: {
						parsing_status: "failed",
						parsing_error: errorMessage,
					},
				});

				results.push({
					fileId: file.id,
					success: false,
					error: errorMessage,
				});
			}
		}

		const successCount = results.filter((r) => r.success).length;
		const failCount = results.filter((r) => !r.success).length;

		return NextResponse.json({
			success: true,
			message: `Processed ${successCount} file(s) successfully, ${failCount} failed`,
			processed: results.length,
			results,
		});
	} catch (error) {
		console.error("[PROCESS-FILE] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

/**
 * GET endpoint to check processing status
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const fileId = searchParams.get("fileId");

		if (fileId) {
			// Get status for specific file
			const file = await prisma.fileList.findUnique({
				where: { id: parseInt(fileId, 10) },
				select: {
					id: true,
					parsing_status: true,
					parsing_error: true,
					parsed_at: true,
				},
			});

			if (!file) {
				return NextResponse.json({ error: "File not found" }, { status: 404 });
			}

			return NextResponse.json({
				fileId: file.id,
				status: file.parsing_status,
				error: file.parsing_error,
				parsedAt: file.parsed_at,
			});
		} else {
			// Get counts for all statuses
			const [pending, processing, completed, failed] = await Promise.all([
				prisma.fileList.count({ where: { parsing_status: "pending" } }),
				prisma.fileList.count({ where: { parsing_status: "processing" } }),
				prisma.fileList.count({ where: { parsing_status: "completed" } }),
				prisma.fileList.count({ where: { parsing_status: "failed" } }),
			]);

			return NextResponse.json({
				pending,
				processing,
				completed,
				failed,
				total: pending + processing + completed + failed,
			});
		}
	} catch (error) {
		console.error("[PROCESS-FILE] GET Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
