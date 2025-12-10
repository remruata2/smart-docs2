/**
 * PDF.js Worker Cache Utility
 * Downloads and caches the PDF.js worker file for Node.js server-side usage
 * Node.js ESM loader only supports file:// and data: protocols, so we need to
 * download the worker file and cache it locally
 */

import { join } from "path";
import { tmpdir } from "os";
import { writeFile, mkdir, access } from "fs/promises";
import { constants } from "fs";

const WORKER_CACHE_DIR = join(tmpdir(), "pdfjs-worker-cache");

/**
 * Ensure the PDF.js worker file is cached locally
 * Downloads from CDN if not already cached
 * @param version PDF.js version (e.g., "5.4.296")
 * @returns file:// URL to the cached worker file
 */
export async function ensureWorkerFile(version: string): Promise<string> {
	// Ensure cache directory exists
	await mkdir(WORKER_CACHE_DIR, { recursive: true });

	const workerFileName = `pdf.worker.${version}.min.mjs`;
	const workerFilePath = join(WORKER_CACHE_DIR, workerFileName);
	const workerFileUrl = `file://${workerFilePath}`;

	try {
		// Check if file already exists
		await access(workerFilePath, constants.F_OK);
		// File exists, return file:// URL
		return workerFileUrl;
	} catch {
		// File doesn't exist, download it
		console.log(`[PDF-WORKER-CACHE] Downloading worker file for version ${version}...`);
		
		const cdnUrl = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
		const response = await fetch(cdnUrl);

		if (!response.ok) {
			throw new Error(
				`Failed to download worker file: ${response.status} ${response.statusText}`
			);
		}

		const workerCode = await response.text();
		await writeFile(workerFilePath, workerCode, "utf-8");

		console.log(`[PDF-WORKER-CACHE] Worker file cached at ${workerFilePath}`);
		return workerFileUrl;
	}
}

