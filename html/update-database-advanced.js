const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

// Initialize Prisma client
const prisma = new PrismaClient();

// Configuration
const CONFIG = {
	// Matching strategies (in order of preference)
	matchingStrategies: [
		"exact_file_no",
		"contains_file_no",
		"numeric_id",
		"fuzzy_match",
	],

	// Dry run mode (set to false to actually update database)
	dryRun: true,

	// Log level: 'verbose', 'normal', 'minimal'
	logLevel: "normal",

	// Backup original content before updating
	backupOriginal: true,

	// Maximum content length (to prevent extremely long updates)
	maxContentLength: 1000000, // 1MB
};

// Function to log messages based on log level
function log(message, level = "normal") {
	if (
		CONFIG.logLevel === "verbose" ||
		level === "minimal" ||
		level === CONFIG.logLevel
	) {
		console.log(message);
	}
}

// Function to extract file number from filename with multiple strategies
function extractFileNumber(filename) {
	const baseName = filename.replace("-enhanced.md", "");

	// Strategy 1: Extract numeric file number
	const numericMatch = baseName.match(/(\d+)/);
	if (numericMatch) {
		return {
			type: "numeric",
			value: numericMatch[1],
			confidence: "high",
		};
	}

	// Strategy 2: Extract alphanumeric file number
	const alphanumericMatch = baseName.match(/([A-Za-z0-9]+)/);
	if (alphanumericMatch) {
		return {
			type: "alphanumeric",
			value: alphanumericMatch[1],
			confidence: "medium",
		};
	}

	// Strategy 3: Use base name as is
	return {
		type: "basename",
		value: baseName,
		confidence: "low",
	};
}

// Function to find database record using multiple strategies
async function findRecordByFileNumber(fileNumberInfo) {
	const { value, type, confidence } = fileNumberInfo;

	log(
		`  🔍 Searching with ${type} value: "${value}" (confidence: ${confidence})`,
		"verbose"
	);

	try {
		// Strategy 1: Exact file_no match
		let record = await prisma.fileList.findFirst({
			where: { file_no: value },
		});

		if (record) {
			log(`  ✅ Found by exact file_no match`, "verbose");
			return { record, strategy: "exact_file_no", confidence: "high" };
		}

		// Strategy 2: Contains file_no match
		record = await prisma.fileList.findFirst({
			where: {
				file_no: { contains: value },
			},
		});

		if (record) {
			log(`  ✅ Found by contains file_no match`, "verbose");
			return { record, strategy: "contains_file_no", confidence: "medium" };
		}

		// Strategy 3: Numeric ID match (if value is numeric)
		if (type === "numeric" && !isNaN(value)) {
			record = await prisma.fileList.findUnique({
				where: { id: parseInt(value) },
			});

			if (record) {
				log(`  ✅ Found by numeric ID match`, "verbose");
				return { record, strategy: "numeric_id", confidence: "high" };
			}
		}

		// Strategy 4: Fuzzy match in title or file_no
		record = await prisma.fileList.findFirst({
			where: {
				OR: [{ title: { contains: value } }, { file_no: { contains: value } }],
			},
		});

		if (record) {
			log(`  ✅ Found by fuzzy match`, "verbose");
			return { record, strategy: "fuzzy_match", confidence: "low" };
		}

		log(`  ❌ No record found with any strategy`, "verbose");
		return null;
	} catch (error) {
		log(`  ❌ Error in database search: ${error.message}`, "verbose");
		return null;
	}
}

// Function to backup original content
async function backupOriginalContent(recordId) {
	if (!CONFIG.backupOriginal) return null;

	try {
		const record = await prisma.fileList.findUnique({
			where: { id: recordId },
			select: { note: true, content_format: true },
		});

		if (record && record.note) {
			const backupPath = `backup_${recordId}_${Date.now()}.txt`;
			const backupContent =
				`Original content from record ${recordId}\n` +
				`Content format: ${record.content_format || "unknown"}\n` +
				`Backup time: ${new Date().toISOString()}\n` +
				`---\n\n${record.note}`;

			fs.writeFileSync(backupPath, backupContent, "utf-8");
			log(`  💾 Backup created: ${backupPath}`, "verbose");
			return backupPath;
		}
	} catch (error) {
		log(`  ⚠️  Backup failed: ${error.message}`, "verbose");
	}

	return null;
}

// Function to update database record with markdown content
async function updateRecordWithMarkdown(recordId, markdownContent, backupPath) {
	try {
		// Check content length
		if (markdownContent.length > CONFIG.maxContentLength) {
			throw new Error(
				`Content too long: ${markdownContent.length} characters (max: ${CONFIG.maxContentLength})`
			);
		}

		if (CONFIG.dryRun) {
			log(
				`  🔄 DRY RUN: Would update record ${recordId} with ${markdownContent.length} characters`
			);
			return { success: true, dryRun: true, recordId };
		}

		// Create backup first
		await backupOriginalContent(recordId);

		// Update the record
		const updatedRecord = await prisma.fileList.update({
			where: { id: recordId },
			data: {
				note: markdownContent,
				content_format: "markdown",
				updated_at: new Date(),
			},
		});

		log(`  ✅ Successfully updated record ${recordId}`, "verbose");
		return { success: true, recordId, updatedRecord };
	} catch (error) {
		log(`  ❌ Update failed: ${error.message}`, "verbose");
		return { success: false, error: error.message };
	}
}

// Function to process a single markdown file
async function processMarkdownFile(filePath) {
	try {
		const filename = path.basename(filePath);
		const fileNumberInfo = extractFileNumber(filename);

		log(`Processing ${filename}`, "normal");
		log(
			`  📊 Extracted: ${fileNumberInfo.type} = "${fileNumberInfo.value}" (${fileNumberInfo.confidence} confidence)`,
			"verbose"
		);

		// Read markdown content
		const markdownContent = fs.readFileSync(filePath, "utf-8");
		log(`  📖 Read ${markdownContent.length} characters`, "verbose");

		// Find database record
		const searchResult = await findRecordByFileNumber(fileNumberInfo);

		if (!searchResult) {
			log(
				`  ⚠️  No database record found for: ${fileNumberInfo.value}`,
				"normal"
			);
			return {
				success: false,
				reason: "No matching record found",
				fileNumber: fileNumberInfo.value,
				confidence: fileNumberInfo.confidence,
			};
		}

		const { record, strategy, confidence } = searchResult;

		log(
			`  ✅ Found record: ID ${record.id}, File No: "${record.file_no}", Title: "${record.title}"`,
			"normal"
		);
		log(
			`  🎯 Matched using: ${strategy} (${confidence} confidence)`,
			"verbose"
		);

		// Update record with markdown content
		const updateResult = await updateRecordWithMarkdown(
			record.id,
			markdownContent
		);

		if (updateResult.success) {
			if (updateResult.dryRun) {
				log(`  🔄 DRY RUN: Would update record ${record.id}`, "normal");
			} else {
				log(`  ✅ Successfully updated record ${record.id}`, "normal");
			}

			return {
				success: true,
				recordId: record.id,
				fileNo: record.file_no,
				strategy,
				confidence,
				dryRun: updateResult.dryRun || false,
			};
		} else {
			log(
				`  ❌ Failed to update record ${record.id}: ${updateResult.error}`,
				"normal"
			);
			return {
				success: false,
				reason: updateResult.error,
				recordId: record.id,
			};
		}
	} catch (error) {
		log(`❌ Error processing ${filePath}: ${error.message}`, "normal");
		return { success: false, reason: error.message };
	}
}

// Function to show configuration
function showConfiguration() {
	log("🔧 CONFIGURATION:", "minimal");
	log(`  Dry Run Mode: ${CONFIG.dryRun ? "ON" : "OFF"}`, "minimal");
	log(`  Log Level: ${CONFIG.logLevel}`, "minimal");
	log(`  Backup Original: ${CONFIG.backupOriginal ? "ON" : "OFF"}`, "minimal");
	log(
		`  Max Content Length: ${CONFIG.maxContentLength.toLocaleString()} characters`,
		"minimal"
	);
	log("", "minimal");
}

// Main function to process all markdown files
async function processAllMarkdownFiles() {
	log("🚀 Advanced Markdown to Database Update Script", "minimal");
	log("================================================", "minimal");

	showConfiguration();

	try {
		// Get all markdown files in current directory
		const markdownFiles = fs
			.readdirSync(".")
			.filter((file) => file.endsWith("-enhanced.md"));

		if (markdownFiles.length === 0) {
			log("❌ No markdown files found in current directory", "minimal");
			log("   Expected files with pattern: *-enhanced.md", "minimal");
			return;
		}

		log(
			`📁 Found ${markdownFiles.length} markdown files to process:`,
			"minimal"
		);
		markdownFiles.forEach((file) => log(`   - ${file}`, "verbose"));
		log("", "minimal");

		let successCount = 0;
		let failureCount = 0;
		let dryRunCount = 0;
		const results = [];

		// Process each markdown file
		for (const filename of markdownFiles) {
			const result = await processMarkdownFile(filename);
			results.push({ filename, ...result });

			if (result.success) {
				if (result.dryRun) {
					dryRunCount++;
				} else {
					successCount++;
				}
			} else {
				failureCount++;
			}

			log("", "verbose"); // Add spacing between files
		}

		// Summary
		log("=".repeat(60), "minimal");
		log("📋 UPDATE SUMMARY", "minimal");
		log("=".repeat(60), "minimal");

		if (CONFIG.dryRun) {
			log(`🔄 DRY RUN MODE: ${dryRunCount} files would be updated`, "minimal");
		} else {
			log(`✅ Successful updates: ${successCount}`, "minimal");
		}

		log(`❌ Failed updates: ${failureCount}`, "minimal");

		if (successCount > 0 || dryRunCount > 0) {
			log("", "minimal");
			if (CONFIG.dryRun) {
				log("🔄 Files that would be updated (DRY RUN):", "minimal");
			} else {
				log("🎉 Successfully updated records:", "minimal");
			}

			results
				.filter((r) => r.success)
				.forEach((result) => {
					const status = result.dryRun ? "DRY RUN" : "UPDATED";
					log(
						`  - ${result.filename} → Record ID: ${result.recordId} (File No: ${result.fileNo}) [${status}]`,
						"minimal"
					);
				});
		}

		if (failureCount > 0) {
			log("", "minimal");
			log("⚠️  Failed updates:", "minimal");
			results
				.filter((r) => !r.success)
				.forEach((result) => {
					log(`  - ${result.filename}: ${result.reason}`, "minimal");
				});
		}

		// Recommendations
		if (CONFIG.dryRun && dryRunCount > 0) {
			log("", "minimal");
			log(
				"💡 To actually update the database, set CONFIG.dryRun = false",
				"minimal"
			);
		}
	} catch (error) {
		log("❌ Error in main process:", error.message, "minimal");
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
