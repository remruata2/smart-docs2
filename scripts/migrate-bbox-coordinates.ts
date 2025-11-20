/**
 * Migration Script: Convert Bounding Box Coordinates
 * 
 * This script converts old bounding box coordinates from PDF points to percentages (0-1).
 * 
 * Old format: [x, y, w, h] in PDF points (e.g., [100, 200, 300, 50])
 * New format: [x, y, w, h] as percentages (e.g., [0.163, 0.253, 0.490, 0.063])
 * 
 * Usage:
 *   npx tsx scripts/migrate-bbox-coordinates.ts
 * 
 * Or with Node:
 *   node --loader ts-node/esm scripts/migrate-bbox-coordinates.ts
 */

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

// Standard PDF dimensions in points (72 DPI)
const PAGE_WIDTH = 612;  // US Letter: 8.5" × 11"
const PAGE_HEIGHT = 792;

/**
 * Convert PDF point coordinates to percentages (0-1)
 */
function convertBBoxToPercentages(bbox: number[]): number[] {
	if (!Array.isArray(bbox) || bbox.length !== 4) {
		return [0, 0, 1, 1]; // Default to full page
	}

	const [x, y, w, h] = bbox;

	// If any value is > 1, assume it's in PDF points (old format)
	if (x > 1 || y > 1 || w > 1 || h > 1) {
		return [
			Math.max(0, Math.min(1, x / PAGE_WIDTH)),
			Math.max(0, Math.min(1, y / PAGE_HEIGHT)),
			Math.max(0, Math.min(1, w / PAGE_WIDTH)),
			Math.max(0, Math.min(1, h / PAGE_HEIGHT)),
		];
	}

	// Already in percentage format, return as-is
	return [x, y, w, h];
}

/**
 * Check if a bounding box needs conversion
 */
function needsConversion(bbox: any): boolean {
	if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) {
		return false;
	}

	const [x, y, w, h] = bbox;
	// If any value is > 1, it's in PDF points and needs conversion
	return x > 1 || y > 1 || w > 1 || h > 1;
}

async function migrateBoundingBoxes() {
	console.log("🔄 Starting bounding box coordinate migration...\n");

	try {
		// Get all chunks with bounding boxes
		const chunks = await prisma.fileChunk.findMany({
			where: {
				bbox: {
					not: null,
				},
			},
			select: {
				id: true,
				file_id: true,
				page_number: true,
				bbox: true,
			},
		});

		console.log(`📊 Found ${chunks.length} chunks with bounding boxes\n`);

		let convertedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const chunk of chunks) {
			try {
				const bbox = chunk.bbox as any;

				if (!needsConversion(bbox)) {
					skippedCount++;
					continue;
				}

				const convertedBbox = convertBBoxToPercentages(bbox as number[]);

				// Update the chunk with converted coordinates
				await prisma.fileChunk.update({
					where: { id: chunk.id },
					data: { bbox: convertedBbox },
				});

				convertedCount++;

				if (convertedCount % 100 === 0) {
					console.log(`  ✓ Converted ${convertedCount} chunks...`);
				}
			} catch (error) {
				console.error(
					`  ❌ Error converting chunk ${chunk.id}:`,
					error instanceof Error ? error.message : error
				);
				errorCount++;
			}
		}

		console.log("\n✅ Migration completed!\n");
		console.log(`   Converted: ${convertedCount} chunks`);
		console.log(`   Skipped: ${skippedCount} chunks (already in correct format)`);
		console.log(`   Errors: ${errorCount} chunks`);

		if (convertedCount > 0) {
			console.log(
				"\n💡 Note: Old files will now display highlights correctly without re-uploading."
			);
		}
	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the migration
migrateBoundingBoxes()
	.then(() => {
		console.log("\n✨ Done!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});

