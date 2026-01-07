import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdmin } from "@/lib/auth";
import { ensureWorkerFile } from "@/lib/pdf-worker-cache";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

// Route segment config for increased body size limit (500MB for textbook uploads)
export const fetchCache = 'force-no-store';
export const dynamic = 'force-dynamic';

// Polyfill DOMMatrix for Node.js (required by react-pdf/pdfjs-dist)
// Must be set at module level before any imports that use it
if (typeof globalThis.DOMMatrix === "undefined") {
	const DOMMatrixPolyfill = class DOMMatrix {
		constructor(init?: string | number[]) {
			// Simple polyfill - just create an identity matrix
			this.a = 1;
			this.b = 0;
			this.c = 0;
			this.d = 1;
			this.e = 0;
			this.f = 0;
		}
		a = 1;
		b = 0;
		c = 0;
		d = 1;
		e = 0;
		f = 0;
	} as any;

	// Set on both globalThis and global for compatibility
	globalThis.DOMMatrix = DOMMatrixPolyfill;
	if (typeof global !== "undefined") {
		(global as any).DOMMatrix = DOMMatrixPolyfill;
	}
}

/**
 * Server-side PDF text extraction API
 * Extracts text from PDF files using react-pdf's pdfjs on the server
 * Extracts text from each page individually for proper chapter detection
 * react-pdf is in serverExternalPackages to avoid bundling issues
 */
export async function POST(req: NextRequest) {
	// Check authentication
	const session = await getServerSession(authOptions);
	if (!session?.user || !isAdmin((session.user as any).role)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const formData = await req.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Check file size (500MB limit for textbooks)
		const maxSize = 500 * 1024 * 1024; // 500MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: `File too large. Maximum size is 500MB.` },
				{ status: 413 }
			);
		}

		// Import react-pdf's pdfjs - already in serverExternalPackages
		// DOMMatrix polyfill is set at module level above
		const { pdfjs } = await import("react-pdf");

		// Configure worker using cached file (Node.js ESM only supports file:// protocol)
		// Download and cache worker file if not already cached
		const workerFileUrl = await ensureWorkerFile(pdfjs.version);
		pdfjs.GlobalWorkerOptions.workerSrc = workerFileUrl;

		// Read file as ArrayBuffer and convert to Uint8Array
		const arrayBuffer = await file.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		// Load PDF document
		const loadingTask = pdfjs.getDocument({
			data: uint8Array,
			useSystemFonts: true,
			verbosity: 0,
		});

		const pdf = await loadingTask.promise;
		const pages: Array<{ page: number; text: string; md: string }> = [];
		const totalPages = pdf.numPages;

		// Extract text from each page individually
		// This is critical for chapter detection which needs to identify
		// which page contains chapter markers
		for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
			const page = await pdf.getPage(pageNum);
			const textContent = await page.getTextContent();

			// Preserve newlines by detecting Y-position changes
			// This is essential for chapter marker regex patterns to work
			let pageText = "";
			let lastY: number | null = null;
			let lastX: number | null = null;

			// Calculate average line height from first few items for adaptive threshold
			let lineHeights: number[] = [];
			let prevY: number | null = null;
			for (let i = 0; i < Math.min(20, textContent.items.length); i++) {
				const item = textContent.items[i] as any;
				const y = item.transform?.[5] ?? item.y ?? null;
				if (y !== null && prevY !== null) {
					const diff = Math.abs(y - prevY);
					if (diff > 0.1 && diff < 50) {
						// Reasonable line height range
						lineHeights.push(diff);
					}
				}
				if (y !== null) prevY = y;
			}
			const avgLineHeight =
				lineHeights.length > 0
					? lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length
					: 2.0; // Default fallback
			const lineHeightThreshold = avgLineHeight * 0.3; // 30% of average line height

			for (const item of textContent.items as any[]) {
				const currentY = item.transform?.[5] ?? item.y ?? null;
				const currentX = item.transform?.[4] ?? item.x ?? null;
				const text = item.str || "";

				if (text.trim().length === 0) {
					continue; // Skip empty items
				}

				if (currentY === null) {
					// Fallback: if no Y position, just add text with space
					if (
						pageText.length > 0 &&
						!pageText.endsWith("\n") &&
						!pageText.endsWith(" ")
					) {
						pageText += " ";
					}
					pageText += text;
					continue;
				}

				// Check if we've moved to a new line
				if (lastY !== null) {
					const yDiff = currentY - lastY; // Use signed difference to detect direction

					// If Y position changed significantly downward (new line), it's a new line
					// Also check if X position reset (start of new line) or Y moved up significantly
					const isNewLine =
						yDiff < -lineHeightThreshold || // Moved up significantly (rare, but possible)
						yDiff > lineHeightThreshold || // Moved down significantly
						(lastX !== null &&
							currentX !== null &&
							currentX < lastX &&
							Math.abs(yDiff) > lineHeightThreshold * 0.5); // X reset with Y change

					if (isNewLine) {
						pageText += "\n";
					} else {
						// Same line - add space if needed
						if (
							pageText.length > 0 &&
							!pageText.endsWith("\n") &&
							!pageText.endsWith(" ")
						) {
							pageText += " ";
						}
					}
				}

				pageText += text;
				lastY = currentY;
				lastX = currentX;
			}

			pageText = pageText.trim();

			pages.push({
				page: pageNum, // 1-indexed page number
				text: pageText,
				md: pageText, // Same as text for compatibility with LlamaParsePageResult
			});
		}

		return NextResponse.json({ success: true, pages });
	} catch (error) {
		console.error("Error extracting PDF text:", error);
		return NextResponse.json(
			{
				error: `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"
					}`,
			},
			{ status: 500 }
		);
	}
}
