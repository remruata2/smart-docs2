"use server";

import {
	processChapterBackground,
	type ChapterProcessingJob,
} from "@/lib/chapter-processor";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { getQuestionDefaults } from "@/lib/question-bank-defaults";

/**
 * Create chapters with PENDING status and trigger background processing
 */
export async function batchCreateChaptersAsync(formData: FormData) {
	const session = await getServerSession(authOptions);
	if (!session?.user || !isAdmin((session.user as any).role)) {
		return { success: false, error: "Unauthorized" };
	}

	try {
		const subjectId = formData.get("subjectId") as string;
		const chapters = JSON.parse(formData.get("chapters") as string);
		const fullPages = JSON.parse(formData.get("fullPages") as string);
		const file = formData.get("file") as File;
		const accessibleBoards = formData.getAll("accessibleBoards") as string[];
		const questionConfigStr = formData.get("questionConfig") as string;
		const questionConfig = questionConfigStr ? JSON.parse(questionConfigStr) : undefined;
		const examId = formData.get("examId") as string;

		if (!file || !subjectId || !chapters || chapters.length === 0) {
			return { success: false, error: "Missing required fields" };
		}

		// Get subject to derive board from hierarchy (Board → Program → Subject → Chapter)
		const subject = await prisma.subject.findUnique({
			where: { id: parseInt(subjectId) },
			include: {
				program: {
					include: {
						board: true,
					},
				},
			},
		});

		if (!subject) {
			return { success: false, error: "Subject not found" };
		}

		// Auto-derive board from subject's program (unless explicitly set to global)
		const subjectBoardId = subject.program.board_id;
		const isGlobal = accessibleBoards.includes("GLOBAL");

		// Option B: Propagate exam to subject if subject has no exam and examId is provided
		if (examId && !subject.exam_id) {
			await prisma.subject.update({
				where: { id: parseInt(subjectId) },
				data: { exam_id: examId },
			});
		}

		// If global is selected, use empty array
		// If specific boards are selected, use those
		// Otherwise, auto-populate with subject's program's board
		const finalAccessibleBoards = isGlobal
			? []
			: accessibleBoards.length > 0
				? accessibleBoards.filter((b) => b !== "GLOBAL")
				: [subjectBoardId]; // Auto-add subject's board if not specified

		// Read PDF file buffer
		const pdfBuffer = Buffer.from(await file.arrayBuffer());

		const createdChapterIds: string[] = [];
		const processingJobs: ChapterProcessingJob[] = [];

		// Create all chapters with PENDING status
		for (const detectedChapter of chapters) {
			const chapter = await prisma.chapter.create({
				data: {
					title: detectedChapter.title,
					subject_id: parseInt(subjectId),
					chapter_number: detectedChapter.chapterNumber,
					content_json: [], // Empty for now, will be filled by background processor
					accessible_boards: finalAccessibleBoards,
					is_global: isGlobal,
					is_active: true, // Explicitly set to true
					processing_status: "PENDING",
				},
			});

			createdChapterIds.push(chapter.id.toString());

			// Prepare background processing job
			processingJobs.push({
				chapterId: chapter.id.toString(),
				pdfBuffer,
				fileName: file.name,
				startPage: detectedChapter.startPage,
				questionConfig: questionConfig || getQuestionDefaults(subject.program.exam_category, subject.name),
			});
		}

		// Trigger background processing (fire and forget)
		// Note: In production, you'd use a proper queue like BullMQ
		setImmediate(async () => {
			for (const job of processingJobs) {
				try {
					await processChapterBackground(job);
				} catch (error) {
					console.error(`Failed to process chapter ${job.chapterId}:`, error);
				}
			}
		});

		return {
			success: true,
			message: `Created ${chapters.length} chapter(s) - Processing in background`,
			chapterIds: createdChapterIds,
		};
	} catch (error: any) {
		console.error("Error creating chapters:", error);
		return {
			success: false,
			error: error.message || "Failed to create chapters",
		};
	}
}

/**
 * Ingest a single chapter asynchronously
 * - Creates chapter with PENDING status
 * - Triggers background processing for the whole file
 */
export async function ingestChapterAsync(formData: FormData) {
	const session = await getServerSession(authOptions);
	if (!session?.user || !isAdmin((session.user as any).role)) {
		return { success: false, error: "Unauthorized" };
	}

	try {
		const file = formData.get("file") as File;
		const title = formData.get("title") as string;
		const subjectId = formData.get("subjectId") as string;
		const chapterNumber = formData.get("chapterNumber") as string;
		const accessibleBoards = formData.getAll("accessibleBoards") as string[];
		const questionConfigStr = formData.get("questionConfig") as string;
		const questionConfig = questionConfigStr ? JSON.parse(questionConfigStr) : undefined;
		const examId = formData.get("examId") as string;

		if (!file || !title || !subjectId) {
			return { success: false, error: "Missing required fields" };
		}

		// Get subject to derive board
		const subject = await prisma.subject.findUnique({
			where: { id: parseInt(subjectId) },
			include: {
				program: {
					include: {
						board: true,
					},
				},
			},
		});

		if (!subject) {
			return { success: false, error: "Subject not found" };
		}

		const subjectBoardId = subject.program.board_id;
		const isGlobal = accessibleBoards.includes("GLOBAL");

		// Option B: Propagate exam to subject if subject has no exam and examId is provided
		if (examId && !subject.exam_id) {
			await prisma.subject.update({
				where: { id: parseInt(subjectId) },
				data: { exam_id: examId },
			});
		}

		const finalAccessibleBoards = isGlobal
			? []
			: accessibleBoards.length > 0
				? accessibleBoards.filter((b) => b !== "GLOBAL")
				: [subjectBoardId];

		// Read PDF file buffer
		const pdfBuffer = Buffer.from(await file.arrayBuffer());

		// Create chapter with PENDING status
		const chapter = await prisma.chapter.create({
			data: {
				title,
				subject_id: parseInt(subjectId),
				chapter_number: chapterNumber ? parseInt(chapterNumber) : null,
				content_json: [], // Empty for now
				accessible_boards: finalAccessibleBoards,
				is_global: isGlobal,
				is_active: true,
				processing_status: "PENDING",
			},
		});

		// Trigger background processing (fire and forget)
		setImmediate(async () => {
			try {
				await processChapterBackground({
					chapterId: chapter.id.toString(),
					pdfBuffer,
					fileName: file.name,
					// No start/end page means process whole document
					questionConfig: questionConfig || getQuestionDefaults(subject.program.exam_category, subject.name),
				});
			} catch (error) {
				console.error(`Failed to process chapter ${chapter.id}:`, error);
			}
		});

		return {
			success: true,
			message: "Chapter created - Processing in background",
			chapterId: chapter.id.toString(),
		};
	} catch (error: any) {
		console.error("Error ingesting chapter:", error);
		return {
			success: false,
			error: error.message || "Failed to ingest chapter",
		};
	}
}
