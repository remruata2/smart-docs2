import { prisma } from "@/lib/prisma";
import { LlamaParseDocumentParser } from "@/lib/llamaparse-document-parser";
import { SemanticVectorService } from "@/lib/semantic-vector";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { spawn } from "child_process";
import { promisify } from "util";

/**
 * Process file parsing in the background
 * This function handles:
 * 1. Parsing the file using LlamaParse
 * 2. Generating page images (for PDFs)
 * 3. Creating DocumentPage records
 * 4. Creating FileChunk records with page-level aggregation
 * 5. Updating search vectors and semantic vectors
 */
export async function processFileParsing(
	fileId: number,
	filePath: string,
	parserType: string = "llamaparse"
): Promise<{ success: boolean; error?: string }> {
	try {
		console.log(`[FILE-PARSING] Starting parsing for file ${fileId}, path: ${filePath}`);

		// Update status to processing
		await prisma.fileList.update({
			where: { id: fileId },
			data: { parsing_status: "processing" },
		});

		// 1. Parse the file
		let pages: any[] = [];
		let content = "";

		if (parserType === "docling" || true) { // Force Docling default
			const { convertFileWithDocling } = await import("@/lib/docling-client");
			const result = await convertFileWithDocling(filePath);

			if (!result || result.length === 0) {
				throw new Error("Docling parsing failed to return pages");
			}

			pages = result; // DoclingPage[] is compatible with the expected structure

			// Accumulate text from all pages with page separators for better context
			content = result
				.map((page: any, index: number) => {
					const pageContent = page.md || page.text || "";
					const pageNumber = page.page || (index + 1);
					return pageContent.trim()
						? `--- Page ${pageNumber} ---\n\n${pageContent.trim()}`
						: "";
				})
				.filter((pageText: string) => pageText.length > 0)
				.join("\n\n");
		} else {
			/*
		   // Default to LlamaParse
		   const parser = new LlamaParseDocumentParser();
		   const result = await parser.parseFile(filePath);

		   if (Array.isArray(result)) {
			   pages = result;
			   // Accumulate text from all pages with page separators for better context
			   content = result
				   .map((page: any, index: number) => {
					   const pageContent = page.md || page.text || "";
					   const pageNumber = page.pageNumber || (index + 1);
					   return pageContent.trim()
						   ? `--- Page ${pageNumber} ---\n\n${pageContent.trim()}`
						   : "";
				   })
				   .filter((pageText: string) => pageText.length > 0)
				   .join("\n\n");
		   } else {
			   content = result;
		   }
		   */
		}

		console.log(`[FILE-PARSING] Parsed ${pages.length} pages for file ${fileId}`);

		// 2. Generate page images (if PDF)
		const publicDir = path.join(process.cwd(), "public", "files", String(fileId));
		let imagesGenerated = false;

		// Ensure directory doesn't already exist (clean up any leftover files from previous attempts)
		if (existsSync(publicDir)) {
			console.log(`[FILE-PARSING] Image directory already exists for file ${fileId}, cleaning up...`);
			await fs.rm(publicDir, { recursive: true, force: true });
		}
		await fs.mkdir(publicDir, { recursive: true });

		if (filePath.toLowerCase().endsWith(".pdf")) {
			try {
				console.log(`[FILE-PARSING] Generating images for file ${fileId}...`);
				const child = spawn("pdftocairo", [
					"-jpeg",
					"-scale-to",
					"1024",
					filePath,
					path.join(publicDir, "page"),
				]);

				await new Promise<void>((resolve, reject) => {
					child.on("close", (code) => {
						if (code === 0) {
							resolve();
						} else {
							reject(new Error(`pdftocairo exited with code ${code}`));
						}
					});

					child.on("error", (err) => {
						reject(err);
					});

					child.stderr.on("data", (data) => {
						console.error(`[pdftocairo stderr]: ${data}`);
					});
				});

				// Rename files to remove zero-padding (page-01.jpg -> page-1.jpg)
				const files = await fs.readdir(publicDir);
				for (const file of files) {
					const match = file.match(/^page-0*(\d+)\.jpg$/);
					if (match) {
						const pageNum = parseInt(match[1], 10);
						const oldPath = path.join(publicDir, file);
						const newPath = path.join(publicDir, `page-${pageNum}.jpg`);
						if (oldPath !== newPath && !existsSync(newPath)) {
							await fs.rename(oldPath, newPath);
						}
					}
				}

				// Verify images were actually created
				const imageFiles = await fs.readdir(publicDir);
				const jpgFiles = imageFiles.filter(f => f.endsWith('.jpg'));
				if (jpgFiles.length > 0) {
					imagesGenerated = true;
					console.log(`[FILE-PARSING] Generated ${jpgFiles.length} page images for file ${fileId}`);
				} else {
					console.warn(`[FILE-PARSING] No image files found after generation for file ${fileId}`);
				}
			} catch (imgError) {
				console.error(`[FILE-PARSING] Failed to generate images for file ${fileId}:`, imgError);
				// Continue without images if this fails
			}
		}

		// 3. Create DocumentPage records (only if images were generated or if not a PDF)
		if (pages.length > 0) {
			const pagePromises = pages.map((p: any, i: number) => {
				// Use array index for consistent page numbering
				const pageNumber = i + 1;
				// Only set image_url if images were generated
				const imageUrl = imagesGenerated ? `/files/${fileId}/page-${pageNumber}.jpg` : null;

				return prisma.documentPage.create({
					data: {
						file_id: fileId,
						page_number: pageNumber,
						image_url: imageUrl || "", // Empty string if no images
						width: p.width || 0,
						height: p.height || 0,
					},
				});
			});
			await Promise.all(pagePromises);
			console.log(`[FILE-PARSING] Created ${pages.length} DocumentPage records for file ${fileId}`);
		}

		// 4. Create FileChunk records with page-level aggregation
		// Helper function to convert PDF point coordinates to percentages (0-1)
		function convertBBoxToPercentages(
			bbox: { x: number; y: number; w: number; h: number },
			actualPageWidth: number = 595,
			actualPageHeight: number = 842
		): number[] {
			// Validate bbox values and handle null/undefined
			const x = bbox.x ?? 0;
			const y = bbox.y ?? 0;
			const w = bbox.w ?? 1;
			const h = bbox.h ?? 1;

			// Ensure dimensions are valid (greater than 0)
			if (actualPageWidth <= 0 || actualPageHeight <= 0) {
				console.warn(`[FILE-PARSING] Invalid page dimensions: ${actualPageWidth}x${actualPageHeight}, using defaults`);
				actualPageWidth = 595;
				actualPageHeight = 842;
			}

			return [
				Math.max(0, Math.min(1, x / actualPageWidth)),
				Math.max(0, Math.min(1, y / actualPageHeight)),
				Math.max(0, Math.min(1, w / actualPageWidth)),
				Math.max(0, Math.min(1, h / actualPageHeight)),
			];
		}

		let chunkIndex = 0;
		for (let i = 0; i < pages.length; i++) {
			const p = pages[i];
			const pageWidth = p.width || 595;
			const pageHeight = p.height || 842;
			// Use array index for consistent page numbering (matches DocumentPage)
			const pageNumber = i + 1;

			// Consolidate all text for the search engine (ONE chunk per page)
			let fullPageText = "";
			let layoutItemsArray: Array<{ text: string; bbox: number[] }> = [];

			// LlamaParse returns pages with 'items' property
			const rawLayoutItems = p.items || p.layout || [];
			if (Array.isArray(rawLayoutItems) && rawLayoutItems.length > 0) {
				// Include ALL items that have text content
				const validItems = rawLayoutItems.filter((item: any) => {
					return !!(item.text || item.value || item.md);
				});

				for (const item of validItems) {
					const text = item.text || item.value || item.md || "";
					if (!text.trim()) continue;

					fullPageText += text.trim() + "\n\n";

					if (item.bBox && typeof item.bBox === 'object') {
						// Validate bbox structure
						if (typeof item.bBox.x === 'number' && typeof item.bBox.y === 'number' &&
							typeof item.bBox.w === 'number' && typeof item.bBox.h === 'number') {
							const bbox = convertBBoxToPercentages(item.bBox, pageWidth, pageHeight);
							const textSnippet = text.trim().substring(0, 200);
							layoutItemsArray.push({
								text: textSnippet,
								bbox: bbox,
							});
						} else {
							console.warn(`[FILE-PARSING] Invalid bbox structure for item on page ${pageNumber}:`, item.bBox);
						}
					}
				}
			} else {
				// Fallback: use raw page text
				fullPageText = p.text || p.md || "";
			}

			// Skip empty pages
			if (!fullPageText.trim()) {
				continue;
			}

			// Create ONE chunk per page
			const chunk = await prisma.fileChunk.create({
				data: {
					file_id: fileId,
					chunk_index: chunkIndex++,
					content: fullPageText.trim(),
					page_number: pageNumber, // Use consistent page number
					bbox:
						layoutItemsArray.length > 0
							? layoutItemsArray
							: [0, 0, 1, 1],
				},
			});

			// Update search_vector for the chunk
			await prisma.$executeRaw`
				UPDATE file_chunks
				SET search_vector = to_tsvector('english', ${fullPageText.trim()})
				WHERE id = ${chunk.id}
			`;
		}

		console.log(`[FILE-PARSING] Created ${chunkIndex} FileChunk records for file ${fileId}`);

		// 5. Update file-level search_vector (use the parsed content, not the old note)
		const file = await prisma.fileList.findUnique({
			where: { id: fileId },
			select: { title: true, category: true, note: true, entry_date: true, entry_date_real: true },
		});

		if (file) {
			// Use the parsed content for search_vector (will be stored in note field in step 7)
			await prisma.$executeRaw`
				UPDATE file_list
				SET search_vector = to_tsvector('english',
					COALESCE('Title: ' || ${file.title}, '') || ' | ' ||
					COALESCE('Category: ' || ${file.category}, '') || ' | ' ||
					COALESCE('Content: ' || ${content}, '') || ' | ' ||
					COALESCE(${file.entry_date || ''}, '') || ' ' ||
					COALESCE(EXTRACT(YEAR FROM ${file.entry_date_real})::text, '')
				)
				WHERE id = ${fileId}
			`;
		}

		// 6. Generate semantic vectors
		try {
			await SemanticVectorService.updateSemanticVector(fileId);
			await SemanticVectorService.generateChunkVectors(fileId);
			console.log(`[FILE-PARSING] Generated semantic vectors for file ${fileId}`);
		} catch (vectorError) {
			console.error(`[FILE-PARSING] Semantic vector update failed for file ${fileId}:`, vectorError);
			// Don't fail the whole process if vectors fail
		}

		// 7. Update status to completed and store markdown content in note field
		await prisma.fileList.update({
			where: { id: fileId },
			data: {
				parsing_status: "completed",
				parsed_at: new Date(),
				note: content, // Store the full markdown content (including tables) in note field
			},
		});

		console.log(`[FILE-PARSING] Successfully completed parsing for file ${fileId}`);
		return { success: true };
	} catch (error) {
		console.error(`[FILE-PARSING] Error parsing file ${fileId}:`, error);

		// Extract user-friendly error message
		let errorMessage = "Unknown error during parsing";
		if (error instanceof Error) {
			errorMessage = error.message;

			// Check for LlamaParse credit limit error
			if ((error as any).isCreditLimit ||
				error.message.includes("credit limit") ||
				error.message.includes("exceeded the maximum number of credits")) {
				errorMessage = "LlamaParse API credit limit exceeded. Please upgrade your LlamaParse plan or wait for credits to reset.";
			} else if (error.message.includes("returned no documents")) {
				// Check if the underlying error was a credit limit
				const errorString = JSON.stringify(error);
				if (errorString.includes("exceeded the maximum number of credits") ||
					errorString.includes("credits for your plan")) {
					errorMessage = "LlamaParse API credit limit exceeded. Please upgrade your LlamaParse plan or wait for credits to reset.";
				}
			}
		}

		// Update status to failed
		await prisma.fileList.update({
			where: { id: fileId },
			data: {
				parsing_status: "failed",
				parsing_error: errorMessage,
			},
		});

		return { success: false, error: errorMessage };
	}
}

