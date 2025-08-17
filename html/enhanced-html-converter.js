const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Function to extract text content cleanly with formatting
function getCleanText(element) {
	// Handle special formatting elements
	const strongElements = element.querySelectorAll(
		"strong, b, span[style*='font-weight']"
	);
	const italicElements = element.querySelectorAll(
		"em, i, span[style*='font-style']"
	);
	const underlineElements = element.querySelectorAll(
		"u, span[style*='text-decoration']"
	);

	// Replace formatting elements with markdown syntax
	let text = element.innerHTML;

	// Replace strong/bold elements
	strongElements.forEach((strong) => {
		const strongText = strong.textContent.trim();
		text = text.replace(strong.outerHTML, `**${strongText}**`);
	});

	// Replace italic elements
	italicElements.forEach((italic) => {
		const italicText = italic.textContent.trim();
		text = text.replace(italic.outerHTML, `_${italicText}_`);
	});

	// Replace underline elements
	underlineElements.forEach((underline) => {
		const underlineText = underline.textContent.trim();
		text = text.replace(underline.outerHTML, `_${underlineText}_`);
	});

	// Convert to plain text and clean up
	return text
		.replace(/<[^>]*>/g, "") // Remove remaining HTML tags
		.trim()
		.replace(/\s+/g, " ")
		.replace(/&nbsp;/g, "");
}

// Function to detect if text should be formatted as heading
function shouldBeHeading(element, text) {
	if (!text || text.length < 3) return false;

	// Check for strong/bold elements
	const hasStrong =
		element.querySelector("strong") ||
		element.querySelector('span[style*="font-weight"]') ||
		element.querySelector("b");

	// Check for underlined text
	const hasUnderline =
		element.querySelector("u") ||
		element.querySelector('span[style*="text-decoration"]');

	// Check for uppercase text patterns
	const isUpperCase = text === text.toUpperCase() && text.length > 10;

	// Check for center alignment (often used for titles)
	const isCentered =
		element.style.textAlign === "center" ||
		element.getAttribute("style")?.includes("text-align:center") ||
		element.getAttribute("style")?.includes("text-align: center");

	// Check for important keywords
	const containsKeywords =
		/\b(CONFIDENTIAL|OFFICE|SUBJECT|REPORT|STATE|PERIOD|SUMMARY|LIST|CONSTITUENCY|VOTERS|CARD|JOB|RATION|SPECIAL|DGP|SECRET|CONT)\b/i.test(
			text
		);

	// Check for signature patterns
	const isSignature = /^\([A-Z\.\s]+\)$/.test(text.trim());

	return (
		(hasStrong && (containsKeywords || isCentered)) ||
		(hasUnderline && containsKeywords) ||
		(isUpperCase && containsKeywords) ||
		(isCentered && hasStrong) ||
		isSignature
	);
}

// Function to process HTML and extract all content
function processHTML(htmlContent) {
	const dom = new JSDOM(htmlContent);
	const document = dom.window.document;

	const content = [];

	try {
		// Find all elements in order
		const allElements = document.querySelectorAll(
			"p, table, h1, h2, h3, h4, h5, h6, ol, ul, br, hr, img"
		);

		allElements.forEach((element) => {
			if (element.tagName === "P") {
				// Skip paragraph elements that are inside table cells
				if (element.closest("td, th")) {
					return;
				}

				const text = getCleanText(element);

				if (text) {
					if (shouldBeHeading(element, text)) {
						// Format as heading
						content.push({
							type: "heading",
							text: text,
						});
					} else {
						// Format as regular paragraph
						content.push({
							type: "paragraph",
							text: text,
						});
					}
				}
			} else if (element.tagName.match(/^H[1-6]$/)) {
				// Skip heading elements that are inside table cells
				if (element.closest("td, th")) {
					return;
				}

				const text = getCleanText(element);
				if (text) {
					content.push({
						type: "heading",
						text: text,
					});
				}
			} else if (element.tagName === "TABLE") {
				// Process table
				const tableData = processTable(element);
				if (tableData.rows.length > 0 || tableData.headers.length > 0) {
					content.push({
						type: "table",
						data: tableData,
					});
				}
			} else if (element.tagName === "OL" || element.tagName === "UL") {
				// Process ordered or unordered lists
				const listData = processList(element);
				if (listData.items.length > 0) {
					content.push({
						type: "list",
						data: listData,
					});
				}
			} else if (element.tagName === "BR") {
				// Handle line breaks
				content.push({
					type: "linebreak",
				});
			} else if (element.tagName === "HR") {
				// Handle horizontal rules
				content.push({
					type: "horizontalrule",
				});
			} else if (element.tagName === "IMG") {
				// Handle standalone images
				const src = element.getAttribute("src") || "";
				const alt = element.getAttribute("alt") || "";
				const title = element.getAttribute("title") || "";
				const style = element.getAttribute("style") || "";

				if (src) {
					// Create a meaningful placeholder
					let placeholder = "Image";

					// Try to determine image type from filename or context
					if (src.includes("clip_image")) {
						placeholder = "Document Image";
					} else if (src.includes("signature") || src.includes("sign")) {
						placeholder = "Signature";
					} else if (src.includes("logo") || src.includes("brand")) {
						placeholder = "Logo";
					} else if (src.includes("photo") || src.includes("pic")) {
						placeholder = "Photo";
					} else if (src.includes("diagram") || src.includes("chart")) {
						placeholder = "Diagram/Chart";
					} else if (src.includes("map")) {
						placeholder = "Map";
					}

					// Add context from alt text or title if available
					if (alt) {
						placeholder = `${placeholder}: ${alt}`;
					} else if (title) {
						placeholder = `${placeholder}: ${title}`;
					}

					// Add position context if style contains positioning
					if (style.includes("margin-left") || style.includes("text-align")) {
						const position = style.includes("center")
							? "Centered"
							: style.includes("right")
							? "Right-aligned"
							: style.includes("left")
							? "Left-aligned"
							: "";
						if (position) {
							placeholder = `${placeholder} (${position})`;
						}
					}

					// If no alt/title provided a name, try to use filename from src when not a data URL
					if (!alt && !title) {
						const cleanSrc = src.split("?")[0];
						if (!cleanSrc.startsWith("data:")) {
							try {
								const fname = path.basename(cleanSrc);
								if (fname) {
									// Ensure format like "Image: filename (Position)"
									const base = placeholder.split(":")[0] || "Image";
									const posMatch = placeholder.match(/\(([^)]+)\)$/);
									const posSuffix = posMatch ? ` (${posMatch[1]})` : "";
									placeholder = `${base}: ${fname}${posSuffix}`;
								}
							} catch {}
						}
					}

					content.push({
						type: "image",
						data: {
							src,
							alt,
							title,
							style,
							placeholder,
							originalSrc: src,
						},
					});
				}
			}
		});

		return content;
	} finally {
		// Release JSDOM resources to help GC between files
		dom.window.close();
	}
}

// Function to process table elements
function processTable(tableElement) {
	const rowElements = tableElement.querySelectorAll("tr");

	// We'll build a normalized grid that expands colspan/rowspan to explicit cells.
	const pendingRowSpans = [];
	const grid = [];
	const rowHasThFlags = [];
	const rowHasStrongFlags = [];

	rowElements.forEach((rowElement) => {
		const cellElements = rowElement.querySelectorAll("td, th");
		if (cellElements.length === 0) return;

		// Check if row has any visible text content at all
		const hasAnyText = Array.from(cellElements).some((cell) =>
			getCleanText(cell)
		);
		if (!hasAnyText) return;

		const currentRow = [];
		let columnIndex = 0;

		// Place each cell into the next available column, expanding colspan and tracking rowspan.
		Array.from(cellElements).forEach((cell) => {
			// Advance to next free column if current slots are covered by rowspans from above
			while (pendingRowSpans[columnIndex] > 0) {
				currentRow.push("");
				pendingRowSpans[columnIndex]--;
				columnIndex++;
			}

			const cellText = getCleanText(cell);
			const colspan = Math.max(
				parseInt(cell.getAttribute("colspan") || "1", 10) || 1,
				1
			);
			const rowspan = Math.max(
				parseInt(cell.getAttribute("rowspan") || "1", 10) || 1,
				1
			);

			// Put text in the leading cell, then add empty placeholders for remaining spanned columns
			currentRow.push(cellText);
			for (let k = 1; k < colspan; k++) {
				currentRow.push("");
			}

			// Record rowspans so the next (rowspan-1) rows reserve these columns
			if (rowspan > 1) {
				for (let k = 0; k < colspan; k++) {
					const idx = columnIndex + k;
					pendingRowSpans[idx] = (pendingRowSpans[idx] || 0) + (rowspan - 1);
				}
			}

			columnIndex += colspan;
		});

		// After placing provided cells, advance through any trailing occupied columns (rare but safe)
		while (pendingRowSpans[columnIndex] > 0) {
			currentRow.push("");
			pendingRowSpans[columnIndex]--;
			columnIndex++;
		}

		grid.push(currentRow);
		rowHasThFlags.push(rowElement.querySelectorAll("th").length > 0);
		rowHasStrongFlags.push(
			Array.from(cellElements).some(
				(cell) =>
					cell.querySelector("strong") ||
					cell.querySelector("b") ||
					cell.querySelector('span[style*="font-weight"]')
			)
		);
	});

	// Determine the maximum number of columns and normalize row lengths
	let maxColumns = 0;
	grid.forEach((r) => {
		if (r.length > maxColumns) maxColumns = r.length;
	});

	const normalizedRows = grid.map((r) => {
		const out = [...r];
		while (out.length < maxColumns) out.push("");
		return out;
	});

	// Choose headers: prefer the first row containing any TH; fallback to first row with "strong" content
	let headerIndex = rowHasThFlags.findIndex((v) => v);
	if (headerIndex === -1) {
		headerIndex = rowHasStrongFlags.findIndex((v) => v);
	}

	const tableData = {
		headers: [],
		rows: [],
		columnCount: maxColumns,
	};

	if (headerIndex !== -1 && normalizedRows[headerIndex]) {
		tableData.headers = normalizedRows[headerIndex];
		tableData.rows = normalizedRows.filter((_, idx) => idx !== headerIndex);
	} else {
		// No explicit headers; treat all as data rows
		tableData.rows = normalizedRows;
	}

	return tableData;
}

// Function to process list elements
function processList(listElement) {
	const listItems = listElement.querySelectorAll("li");
	const listData = {
		type: listElement.tagName.toLowerCase(), // "ol" or "ul"
		items: [],
	};

	listItems.forEach((item) => {
		const text = getCleanText(item);
		if (text) {
			listData.items.push(text);
		}
	});

	return listData;
}

// Function to handle images in content
function processImages(element) {
	const images = element.querySelectorAll("img");
	if (images.length > 0) {
		const imageData = Array.from(images).map((img) => {
			const src = img.getAttribute("src") || "";
			const alt = img.getAttribute("alt") || "";
			const title = img.getAttribute("title") || "";
			const style = img.getAttribute("style") || "";

			// Create a meaningful placeholder based on context
			let placeholder = "Image";

			// Try to determine image type from filename or context
			if (src.includes("clip_image")) {
				placeholder = "Document Image";
			} else if (src.includes("signature") || src.includes("sign")) {
				placeholder = "Signature";
			} else if (src.includes("logo") || src.includes("brand")) {
				placeholder = "Logo";
			} else if (src.includes("photo") || src.includes("pic")) {
				placeholder = "Photo";
			} else if (src.includes("diagram") || src.includes("chart")) {
				placeholder = "Diagram/Chart";
			} else if (src.includes("map")) {
				placeholder = "Map";
			}

			// Add context from alt text or title if available
			if (alt) {
				placeholder = `${placeholder}: ${alt}`;
			} else if (title) {
				placeholder = `${placeholder}: ${title}`;
			}

			// Add position context if style contains positioning
			if (style.includes("margin-left") || style.includes("text-align")) {
				const position = style.includes("center")
					? "Centered"
					: style.includes("right")
					? "Right-aligned"
					: style.includes("left")
					? "Left-aligned"
					: "";
				if (position) {
					placeholder = `${placeholder} (${position})`;
				}
			}

			return {
				src,
				alt,
				title,
				style,
				placeholder,
				originalSrc: src, // Keep original for reference
			};
		});
		return imageData;
	}
	return [];
}

// Function to convert content to markdown
function contentToMarkdown(content) {
	let markdown = "";

	content.forEach((item, index) => {
		if (index > 0) {
			// Add appropriate spacing based on content type
			const prevItem = content[index - 1];
			if (prevItem.type === "linebreak" || prevItem.type === "horizontalrule") {
				// Don't add extra spacing after line breaks or horizontal rules
			} else if (item.type === "linebreak" || item.type === "horizontalrule") {
				// Don't add spacing before line breaks or horizontal rules
			} else {
				markdown += "\n\n";
			}
		}

		switch (item.type) {
			case "heading":
				markdown += `**${item.text}**`;
				break;

			case "paragraph":
				markdown += item.text;
				break;

			case "table":
				const tableData = item.data;
				const columnCount =
					tableData.columnCount ||
					Math.max(
						tableData.headers.length,
						...tableData.rows.map((row) => row.length)
					);

				if (tableData.headers.length > 0) {
					// Use actual headers
					const headers = tableData.headers.map((header) => header || "");
					const paddedHeaders = [...headers];
					while (paddedHeaders.length < columnCount) {
						paddedHeaders.push("");
					}

					markdown += `| ${paddedHeaders
						.slice(0, columnCount)
						.join(" | ")} |\n`;
					markdown += `| ${Array(columnCount).fill("---").join(" | ")} |\n`;

					// Add data rows
					tableData.rows.forEach((row) => {
						const paddedRow = [...row];
						while (paddedRow.length < columnCount) {
							paddedRow.push("");
						}

						const cleanRow = paddedRow.slice(0, columnCount).map((cell) => {
							const cleanCell = cell || "";
							return cleanCell;
						});

						markdown += `| ${cleanRow.join(" | ")} |\n`;
					});
				} else if (tableData.rows.length > 0) {
					// Fallback: use first row as headers if no explicit headers
					const firstRow = tableData.rows[0];
					const paddedFirstRow = [...firstRow];
					while (paddedFirstRow.length < columnCount) {
						paddedFirstRow.push("");
					}

					markdown += `| ${paddedFirstRow
						.slice(0, columnCount)
						.join(" | ")} |\n`;
					markdown += `| ${Array(columnCount).fill("---").join(" | ")} |\n`;

					// Add remaining rows
					tableData.rows.slice(1).forEach((row) => {
						const paddedRow = [...row];
						while (paddedRow.length < columnCount) {
							paddedRow.push("");
						}

						const cleanRow = paddedRow.slice(0, columnCount).map((cell) => {
							const cleanCell = cell || "";
							return cleanCell;
						});

						markdown += `| ${cleanRow.join(" | ")} |\n`;
					});
				}
				break;

			case "list":
				const listData = item.data;
				const listType = listData.type;
				const listItems = listData.items;

				listItems.forEach((itemText, itemIndex) => {
					if (itemIndex > 0) markdown += "\n";
					if (listType === "ol") {
						// Ordered list with sequential numbering
						markdown += `${itemIndex + 1}. ${itemText}`;
					} else {
						// Unordered list with bullet points
						markdown += `- ${itemText}`;
					}
				});
				break;

			case "linebreak":
				markdown += "\n";
				break;

			case "horizontalrule":
				markdown += "\n---\n";
				break;

			case "image":
				const imageData = item.data;
				// Use the meaningful placeholder instead of the file path
				markdown += `[${imageData.placeholder}]`;
				break;
		}
	});

	return markdown.trim();
}

// Function to convert a single HTML file to Markdown
function convertHtmlFile(inputPath, outputPath) {
	try {
		const htmlContent = fs.readFileSync(inputPath, "utf-8");
		const content = processHTML(htmlContent);
		const markdown = contentToMarkdown(content);

		fs.writeFileSync(outputPath, markdown, "utf-8");

		const originalSize = fs.statSync(inputPath).size;
		const convertedSize = fs.statSync(outputPath).size;

		// Count different content types
		const headingCount = content.filter(
			(item) => item.type === "heading"
		).length;
		const paragraphCount = content.filter(
			(item) => item.type === "paragraph"
		).length;
		const tableCount = content.filter((item) => item.type === "table").length;
		const listCount = content.filter((item) => item.type === "list").length;
		const imageCount = content.filter((item) => item.type === "image").length;
		const linebreakCount = content.filter(
			(item) => item.type === "linebreak"
		).length;
		const horizontalruleCount = content.filter(
			(item) => item.type === "horizontalrule"
		).length;
		const totalRows = content
			.filter((item) => item.type === "table")
			.reduce((sum, table) => sum + table.data.rows.length, 0);

		return {
			success: true,
			originalSize,
			convertedSize,
			headingCount,
			paragraphCount,
			tableCount,
			listCount,
			imageCount,
			linebreakCount,
			horizontalruleCount,
			totalRows,
		};
	} catch (error) {
		return {
			success: false,
			error: error.message,
		};
	}
}

// Main batch processing function
function batchConvertFiles() {
	console.log("🚀 Enhanced HTML to Markdown Converter");
	console.log("==========================================\n");


	// Get all HTML files in current directory
	let htmlFiles = fs
		.readdirSync(".")
		.filter((file) => path.extname(file).toLowerCase() === ".html");

	// Sort numerically-aware (so 2.html comes before 10.html)
	htmlFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

	// CLI resume options
	const argv = process.argv.slice(2);
	const startFileIdx = argv.indexOf("--start-file");
	const startIndexIdx = argv.indexOf("--start-index");
	const onlyFileIdx = argv.indexOf("--only-file");
	let startAt = 0; // 0-based index into htmlFiles

	if (startFileIdx !== -1 && argv[startFileIdx + 1]) {
		const startFile = argv[startFileIdx + 1];
		const found = htmlFiles.indexOf(startFile);
		if (found !== -1) startAt = found + 1; // resume AFTER this file
	}

	if (startIndexIdx !== -1 && argv[startIndexIdx + 1]) {
		const n = parseInt(argv[startIndexIdx + 1], 10);
		if (!Number.isNaN(n) && n > 0 && n <= htmlFiles.length) {
			startAt = Math.max(startAt, n - 1); // 1-based -> 0-based
		}
	}

	// If --only-file is provided, restrict processing to that file and ignore resume
	if (onlyFileIdx !== -1 && argv[onlyFileIdx + 1]) {
		const onlyFile = argv[onlyFileIdx + 1];
		if (!htmlFiles.includes(onlyFile)) {
			console.log(`❌ --only-file not found: ${onlyFile}`);
			process.exit(1);
		}
		htmlFiles = [onlyFile];
		startAt = 0;
		console.log(`🎯 Single-file mode: ${onlyFile}`);
	} else if (startAt > 0) {
		console.log(
			`⏭️  Resuming from index ${startAt + 1} of ${htmlFiles.length}` +
			(htmlFiles[startAt - 1]
				? ` (after ${htmlFiles[startAt - 1]})`
				: "")
		);
	}

	// Apply slice
	htmlFiles = htmlFiles.slice(startAt);

	if (htmlFiles.length === 0) {
		console.log("❌ No HTML files found in current directory");
		process.exit(1);
	}

	console.log(`📁 Found ${htmlFiles.length} HTML files to convert:\n`);

	let totalOriginalSize = 0;
	let totalConvertedSize = 0;
	let successCount = 0;
	let errorCount = 0;
	let totalHeadings = 0;
	let totalParagraphs = 0;
	let totalTables = 0;
	let totalLists = 0;
	let totalImages = 0;
	let totalLinebreaks = 0;
	let totalHorizontalrules = 0;
	let totalRows = 0;

	htmlFiles.forEach((htmlFile, index) => {
		const baseName = path.parse(htmlFile).name;
		const outputFile = `${baseName}-enhanced.md`;

		console.log(`[${index + 1}/${htmlFiles.length}] Converting ${htmlFile}...`);

		const result = convertHtmlFile(htmlFile, outputFile);

		if (result.success) {
			successCount++;
			totalOriginalSize += result.originalSize;
			totalConvertedSize += result.convertedSize;
			totalHeadings += result.headingCount;
			totalParagraphs += result.paragraphCount;
			totalTables += result.tableCount;
			totalLists += result.listCount;
			totalImages += result.imageCount;
			totalLinebreaks += result.linebreakCount;
			totalHorizontalrules += result.horizontalruleCount;
			totalRows += result.totalRows;

			console.log(`   ✅ Success: ${outputFile}`);
			console.log(
				`   📊 ${result.originalSize} bytes → ${result.convertedSize} bytes`
			);
			console.log(
				`   📋 ${result.headingCount} headings, ${result.paragraphCount} paragraphs, ${result.tableCount} tables, ${result.listCount} lists, ${result.imageCount} images (${result.totalRows} rows)`
			);
			if (result.originalSize > 0) {
				console.log(
					`   💾 Reduction: ${(
						(1 - result.convertedSize / result.originalSize) *
						100
					).toFixed(1)}%`
				);
			}
			console.log();
		} else {
			errorCount++;
			console.log(`   ❌ Error: ${result.error}\n`);
		}


	});

	// Summary
	console.log("=".repeat(60));
	console.log("📋 CONVERSION SUMMARY");
	console.log("=".repeat(60));
	console.log(`✅ Successful conversions: ${successCount}`);
	console.log(`❌ Failed conversions: ${errorCount}`);
	console.log(
		`📊 Total original size: ${(totalOriginalSize / 1024).toFixed(1)} KB`
	);
	console.log(
		`📊 Total converted size: ${(totalConvertedSize / 1024).toFixed(1)} KB`
	);
	console.log(`📋 Content extracted:`);
	console.log(`    - ${totalHeadings} headings`);
	console.log(`    - ${totalParagraphs} paragraphs`);
	console.log(`    - ${totalTables} tables with ${totalRows} total rows`);
	console.log(`    - ${totalLists} lists`);
	console.log(`    - ${totalImages} images`);
	console.log(`    - ${totalLinebreaks} line breaks`);
	console.log(`    - ${totalHorizontalrules} horizontal rules`);

	if (totalOriginalSize > 0) {
		console.log(
			`💾 Overall size reduction: ${(
				(1 - totalConvertedSize / totalOriginalSize) *
				100
			).toFixed(1)}%`
		);
	}

	if (successCount > 0) {
		console.log(
			`\n🎉 Successfully converted ${successCount} HTML files to Markdown!`
		);
		console.log(`📁 Output files: *-enhanced.md`);
	}

	if (errorCount > 0) {
		console.log(`\n⚠️  ${errorCount} files had conversion errors.`);
	}
}

// Check if jsdom is available
try {
	require("jsdom");
} catch (error) {
	console.error("❌ Error: jsdom package is required but not installed.");
	console.error("Please run: npm install jsdom");
	process.exit(1);
}

// Run the batch conversion
batchConvertFiles();
