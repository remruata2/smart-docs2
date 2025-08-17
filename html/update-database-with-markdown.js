const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

// Initialize Prisma client
const prisma = new PrismaClient();

// Function to extract file number from filename
function extractFileNumber(filename) {
	// Remove the '-enhanced.md' suffix and get the base name
	const baseName = filename.replace("-enhanced.md", "");

	// Try to extract numeric file number
	const match = baseName.match(/(\d+)/);
	if (match) {
		return match[1];
	}

	// If no numeric match, return the base name
	return baseName;
}

// Function to find database record by file number
async function findRecordByFileNumber(fileNumber) {
	try {
		// First try to find by exact file_no match
		let record = await prisma.fileList.findFirst({
			where: {
				file_no: fileNumber,
			},
		});

		// If not found, try to find by file_no containing the number
		if (!record) {
			record = await prisma.fileList.findFirst({
				where: {
					file_no: {
						contains: fileNumber,
					},
				},
			});
		}

		// If still not found, try to find by ID if fileNumber is numeric
		if (!record && !isNaN(fileNumber)) {
			record = await prisma.fileList.findUnique({
				where: {
					id: parseInt(fileNumber),
				},
			});
		}

		return record;
	} catch (error) {
		console.error(
			`Error finding record for file number ${fileNumber}:`,
			error.message
		);
		return null;
	}
}

// Function to update database record with markdown content
async function updateRecordWithMarkdown(recordId, markdownContent) {
	try {
		const updatedRecord = await prisma.fileList.update({
			where: { id: recordId },
			data: {
				note: markdownContent,
				content_format: "markdown",
				updated_at: new Date(),
			},
		});

		return updatedRecord;
	} catch (error) {
		console.error(`Error updating record ${recordId}:`, error.message);
		return null;
	}
}

// Function to process a single markdown file
async function processMarkdownFile(filePath) {
	try {
		const filename = path.basename(filePath);
		const fileNumber = extractFileNumber(filename);

		console.log(
			`Processing ${filename} (extracted file number: ${fileNumber})`
		);

		// Read markdown content
		const markdownContent = fs.readFileSync(filePath, "utf-8");

		// Find database record
		const record = await findRecordByFileNumber(fileNumber);

		if (!record) {
			console.log(
				`  ⚠️  No database record found for file number: ${fileNumber}`
			);
			return { success: false, reason: "No matching record found" };
		}

		console.log(
			`  ✅ Found record: ID ${record.id}, File No: ${record.file_no}, Title: ${record.title}`
		);

		// Update record with markdown content
		const updatedRecord = await updateRecordWithMarkdown(
			record.id,
			markdownContent
		);

		if (updatedRecord) {
			console.log(
				`  ✅ Successfully updated record ${record.id} with markdown content`
			);
			return { success: true, recordId: record.id, fileNo: record.file_no };
		} else {
			console.log(`  ❌ Failed to update record ${record.id}`);
			return { success: false, reason: "Update failed" };
		}
	} catch (error) {
		console.error(`Error processing ${filePath}:`, error.message);
		return { success: false, reason: error.message };
	}
}

// Main function to process all markdown files
async function processAllMarkdownFiles() {
	console.log("🚀 Markdown to Database Update Script");
	console.log("=====================================\n");

	try {
		// Get all markdown files in current directory
		const markdownFiles = fs
			.readdirSync(".")
			.filter((file) => file.endsWith("-enhanced.md"));

		if (markdownFiles.length === 0) {
			console.log("❌ No markdown files found in current directory");
			console.log("   Expected files with pattern: *-enhanced.md");
			return;
		}

		console.log(
			`📁 Found ${markdownFiles.length} markdown files to process:\n`
		);

		let successCount = 0;
		let failureCount = 0;
		const results = [];

		// Process each markdown file
		for (const filename of markdownFiles) {
			const result = await processMarkdownFile(filename);
			results.push({ filename, ...result });

			if (result.success) {
				successCount++;
			} else {
				failureCount++;
			}

			console.log(); // Add spacing between files
		}

		// Summary
		console.log("=".repeat(60));
		console.log("📋 UPDATE SUMMARY");
		console.log("=".repeat(60));
		console.log(`✅ Successful updates: ${successCount}`);
		console.log(`❌ Failed updates: ${failureCount}`);

		if (successCount > 0) {
			console.log("\n🎉 Successfully updated database with markdown content!");
			console.log("\nUpdated records:");
			results
				.filter((r) => r.success)
				.forEach((result) => {
					console.log(
						`  - ${result.filename} → Record ID: ${result.recordId} (File No: ${result.fileNo})`
					);
				});
		}

		if (failureCount > 0) {
			console.log("\n⚠️  Failed updates:");
			results
				.filter((r) => !r.success)
				.forEach((result) => {
					console.log(`  - ${result.filename}: ${result.reason}`);
				});
		}
	} catch (error) {
		console.error("❌ Error in main process:", error.message);
	} finally {
		await prisma.$disconnect();
	}
}

// Check if Prisma is available
try {
	require("@prisma/client");
} catch (error) {
	console.error(
		"❌ Error: @prisma/client package is required but not installed."
	);
	console.error("Please run: npm install @prisma/client");
	console.error(
		"Also ensure your database is properly configured and migrated."
	);
	process.exit(1);
}

// Run the script
processAllMarkdownFiles();
