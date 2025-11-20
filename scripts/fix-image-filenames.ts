/**
 * Script to fix existing image filenames
 * 
 * Renames zero-padded filenames (page-01.jpg) to non-padded format (page-1.jpg)
 * to match the expected URL format.
 * 
 * Usage:
 *   npx tsx scripts/fix-image-filenames.ts [fileId]
 * 
 * If fileId is provided, only fixes that file. Otherwise fixes all files.
 */

import { PrismaClient } from "../src/generated/prisma";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const prisma = new PrismaClient();

async function fixImageFilenames(fileId?: number) {
	console.log("🔄 Starting image filename fix...\n");

	try {
		let filesToProcess;

		if (fileId) {
			// Fix specific file
			const file = await prisma.fileList.findUnique({
				where: { id: fileId },
			});
			if (!file) {
				console.error(`❌ File with ID ${fileId} not found`);
				process.exit(1);
			}
			filesToProcess = [file];
			console.log(`📁 Fixing file ID: ${fileId}\n`);
		} else {
			// Fix all files with document pages
			filesToProcess = await prisma.fileList.findMany({
				where: {
					pages: {
						some: {},
					},
				},
				select: {
					id: true,
					title: true,
				},
			});
			console.log(`📁 Found ${filesToProcess.length} files to process\n`);
		}

		let fixedCount = 0;
		let errorCount = 0;

		for (const file of filesToProcess) {
			try {
				const fileDir = path.join(
					process.cwd(),
					"public",
					"files",
					String(file.id)
				);

				if (!existsSync(fileDir)) {
					console.log(`  ⚠️  Skipping file ${file.id}: directory not found`);
					continue;
				}

				const files = await fs.readdir(fileDir);
				let renamed = 0;

				for (const filename of files) {
					// Match zero-padded files like page-01.jpg, page-02.jpg
					const match = filename.match(/^page-0+(\d+)\.jpg$/);
					if (match) {
						const pageNum = parseInt(match[1], 10);
						const oldPath = path.join(fileDir, filename);
						const newPath = path.join(fileDir, `page-${pageNum}.jpg`);

						// Only rename if the new name doesn't exist
						if (oldPath !== newPath && !existsSync(newPath)) {
							await fs.rename(oldPath, newPath);
							renamed++;
						}
					}
				}

				if (renamed > 0) {
					console.log(
						`  ✓ File ${file.id} (${file.title || "Untitled"}): Renamed ${renamed} files`
					);
					fixedCount++;
				}
			} catch (error) {
				console.error(
					`  ❌ Error processing file ${file.id}:`,
					error instanceof Error ? error.message : error
				);
				errorCount++;
			}
		}

		console.log("\n✅ Fix completed!\n");
		console.log(`   Fixed: ${fixedCount} files`);
		console.log(`   Errors: ${errorCount} files`);
	} catch (error) {
		console.error("❌ Script failed:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Get fileId from command line args
const fileId = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;

fixImageFilenames(fileId)
	.then(() => {
		console.log("\n✨ Done!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});

