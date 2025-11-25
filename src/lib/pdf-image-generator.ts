import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { supabaseAdmin, validateSupabaseStorage } from "./supabase";
import { readFile } from "fs/promises";

/**
 * Generates JPEG images for each page of a PDF using pdftocairo.
 * @param pdfPath Path to the source PDF file
 * @param outputDir Directory to save generated images
 * @param fileId Unique identifier for the file (used for naming)
 * @returns Array of generated image file paths
 */
export async function generatePageImages(
	pdfPath: string,
	outputDir: string,
	fileId: string,
	startPage?: number,
	endPage?: number
): Promise<string[]> {
	console.log(`[PDF-IMG] Generating images for ${pdfPath} in ${outputDir} (Pages: ${startPage || 'All'}-${endPage || 'All'})`);

	// Ensure output directory exists
	await fs.mkdir(outputDir, { recursive: true });

	const outputPrefix = path.join(outputDir, `${fileId}`);

	// Command: pdftocairo -jpeg -scale-to 1024 [-f start] [-l end] <input> <output_prefix>
	const args = [
		"-jpeg",
		"-scale-to",
		"1024",
	];

	if (startPage) {
		args.push("-f", startPage.toString());
	}

	if (endPage) {
		args.push("-l", endPage.toString());
	}

	args.push(pdfPath, outputPrefix);

	const child = spawn("pdftocairo", args);

	return new Promise((resolve, reject) => {
		let stderr = "";

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", async (code) => {
			if (code === 0) {
				try {
					// List generated files to return them
					const files = await fs.readdir(outputDir);
					// Filter for files belonging to this generation
					const imageFiles = files
						.filter((f) => f.startsWith(fileId) && f.endsWith(".jpg"))
						.sort((a, b) => {
							// Sort by page number: fileId-1.jpg, fileId-2.jpg
							const numA = parseInt(a.match(/-(\d+)\.jpg$/)?.[1] || "0");
							const numB = parseInt(b.match(/-(\d+)\.jpg$/)?.[1] || "0");
							return numA - numB;
						})
						.map((f) => path.join(outputDir, f));

					console.log(`[PDF-IMG] Generated ${imageFiles.length} images`);
					resolve(imageFiles);
				} catch (err) {
					reject(err);
				}
			} else {
				console.error(`[PDF-IMG] pdftocairo failed code=${code}: ${stderr}`);
				reject(new Error(`pdftocairo exited with code ${code}`));
			}
		});

		child.on("error", (err) => {
			console.error(`[PDF-IMG] Spawn error:`, err);
			reject(err);
		});
	});
}

/**
 * Uploads page images to Supabase Storage.
 * @param imagePaths Array of local paths to image files
 * @param folderName Folder in bucket to store images (e.g., chapter-id or book-id)
 * @returns Map of page number to public URL
 */
export async function uploadPageImages(
	imagePaths: string[],
	folderName: string
): Promise<Map<number, string>> {
	const pageUrlMap = new Map<number, string>();
	const BUCKET_NAME = "chapter_pages";

	// Validate connection first
	console.log(
		`[PDF-IMG] Validating Supabase Storage connection before upload...`
	);
	const validation = await validateSupabaseStorage(BUCKET_NAME);

	if (!validation.connected) {
		const error = `Supabase Storage connection failed: ${validation.error}`;
		console.error(`[PDF-IMG] ${error}`);
		throw new Error(error);
	}

	if (!validation.bucketExists) {
		const error = `Supabase Storage bucket '${BUCKET_NAME}' does not exist: ${validation.error}`;
		console.error(`[PDF-IMG] ${error}`);
		if (validation.details?.availableBuckets) {
			console.error(
				`[PDF-IMG] Available buckets: ${validation.details.availableBuckets.join(
					", "
				)}`
			);
		}
		throw new Error(error);
	}

	console.log(
		`[PDF-IMG] ✅ Connection validated. Uploading ${imagePaths.length} images to ${BUCKET_NAME}/${folderName}`
	);

	// Upload in parallel with concurrency limit
	const CONCURRENCY = 5;
	const chunks = [];
	for (let i = 0; i < imagePaths.length; i += CONCURRENCY) {
		chunks.push(imagePaths.slice(i, i + CONCURRENCY));
	}

	let successCount = 0;
	let failureCount = 0;

	for (const chunk of chunks) {
		await Promise.all(
			chunk.map(async (imagePath) => {
				try {
					const filename = path.basename(imagePath);
					// Extract page number from filename (e.g., fileId-1.jpg -> 1)
					const pageMatch = filename.match(/-(\d+)\.jpg$/);
					if (!pageMatch) {
						console.warn(
							`[PDF-IMG] Skipping ${imagePath}: filename doesn't match expected pattern`
						);
						return;
					}

					const pageNum = parseInt(pageMatch[1]);
					const storagePath = `${folderName}/${filename}`;

					console.log(`[PDF-IMG] Uploading ${filename} to ${storagePath}...`);
					const fileBuffer = await readFile(imagePath);
					const fileSize = fileBuffer.length;
					console.log(
						`[PDF-IMG] File size: ${(fileSize / 1024).toFixed(2)} KB`
					);

					if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

					const { data, error } = await supabaseAdmin.storage
						.from(BUCKET_NAME)
						.upload(storagePath, fileBuffer, {
							contentType: "image/jpeg",
							upsert: true,
						});

					if (error) {
						console.error(`[PDF-IMG] Upload error for ${filename}:`, {
							message: error.message,
							name: error.name,
							status: (error as any).status,
							statusCode: (error as any).statusCode,
							error: error,
						});
						throw error;
					}

					console.log(`[PDF-IMG] ✅ Successfully uploaded ${filename}`);

					const {
						data: { publicUrl },
					} = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

					pageUrlMap.set(pageNum, publicUrl);
					successCount++;
				} catch (error: any) {
					failureCount++;
					const errorDetails = {
						message: error?.message,
						name: error?.name,
						code: error?.code,
						cause: error?.cause,
						status: error?.status,
						statusCode: error?.statusCode,
						originalError: error?.originalError,
					};
					console.error(
						`[PDF-IMG] ❌ Failed to upload ${imagePath}:`,
						errorDetails
					);
					console.error(`[PDF-IMG] Full error object:`, error);
				}
			})
		);
	}

	console.log(
		`[PDF-IMG] Upload complete: ${successCount} succeeded, ${failureCount} failed out of ${imagePaths.length} total`
	);
	return pageUrlMap;
}
