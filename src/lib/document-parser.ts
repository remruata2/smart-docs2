// Remove static imports and use dynamic imports instead
export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    sheets?: number;
    tables?: number;
  };
}

interface ExcelTable {
  title: string;
  headers: string[];
  rows: string[][];
  metadata?: {
    startRow: number;
    endRow: number;
    columns: number;
  };
}

export class DocumentParser {
  static async parseWordDocument(buffer: Buffer): Promise<ParsedDocument> {
    try {
      // Dynamic import for mammoth
      const mammoth = (await import("mammoth")).default;

      // Use convertToHtml as it's the recommended approach and properly handles tables
      const result = await mammoth.convertToHtml({ buffer });

      if (!result || !result.value) {
        throw new Error("Failed to extract content from Word document");
      }

      const content = result.value;
      const wordCount = this.countWords(content);

      return {
        content: this.convertHtmlToMarkdown(content),
        metadata: {
          wordCount,
        },
      };
    } catch (error) {
      console.error("Error parsing Word document:", error);
      throw new Error(
        `Failed to parse Word document: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  static async parseExcelDocument(buffer: Buffer): Promise<ParsedDocument> {
    try {
      // Dynamic import for xlsx
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetNames = workbook.SheetNames;
      let content = "";
      let totalTables = 0;

      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const tables = this.extractTablesFromSheet(worksheet, XLSX);

        content += `# ${sheetName}\n\n`;

        if (tables.length === 0) {
          content += "*No data found in this sheet.*\n\n";
          continue;
        }

        for (const table of tables) {
          totalTables++;

          if (table.title && table.title !== sheetName) {
            content += `## ${table.title}\n\n`;
          }

          if (table.headers.length > 0 && table.rows.length > 0) {
            // Create proper markdown table
            content += this.createMarkdownTable(table.headers, table.rows);
          } else if (table.rows.length > 0) {
            // Handle data without clear headers
            content += this.createMarkdownTable([], table.rows);
          }

          content += "\n";
        }
      }

      return {
        content: content.trim(),
        metadata: {
          sheets: sheetNames.length,
          tables: totalTables,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to parse Excel document: ${errorMessage}`);
    }
  }

  private static extractTablesFromSheet(
    worksheet: any,
    XLSX: any
  ): ExcelTable[] {
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
    const tables: ExcelTable[] = [];

    // Get all data as 2D array
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
    }) as any[][];

    if (jsonData.length === 0) {
      return tables;
    }

    // Try to identify table sections
    let currentTable: ExcelTable | null = null;
    let headerRow: string[] = [];
    let dataRows: string[][] = [];
    let lastNonEmptyRow = -1;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const cleanRow = row.map((cell) => (cell || "").toString().trim());
      const hasData = cleanRow.some((cell) => cell.length > 0);

      if (!hasData) {
        // Empty row - might be end of current table
        if (currentTable && dataRows.length > 0) {
          currentTable.rows = [...dataRows];
          tables.push(currentTable);
          currentTable = null;
          dataRows = [];
          headerRow = [];
        }
        continue;
      }

      // Check if this looks like a header row (contains text, not just numbers)
      const mightBeHeader = this.isLikelyHeaderRow(cleanRow, i === 0);

      if (mightBeHeader && !currentTable) {
        // Start new table
        const tableTitle = this.extractTableTitle(cleanRow, i, jsonData);
        currentTable = {
          title: tableTitle,
          headers: cleanRow.filter((cell) => cell.length > 0),
          rows: [],
          metadata: {
            startRow: i,
            endRow: i,
            columns: cleanRow.length,
          },
        };
        headerRow = [...cleanRow];
      } else if (currentTable) {
        // Add to current table
        dataRows.push(cleanRow);
        currentTable.metadata!.endRow = i;
      } else {
        // No current table, treat this row as start of a new table without clear headers
        currentTable = {
          title: `Data Section ${tables.length + 1}`,
          headers: [],
          rows: [cleanRow],
          metadata: {
            startRow: i,
            endRow: i,
            columns: cleanRow.length,
          },
        };
        dataRows = [cleanRow];
      }

      lastNonEmptyRow = i;
    }

    // Add final table if exists
    if (
      currentTable &&
      (dataRows.length > 0 || currentTable.headers.length > 0)
    ) {
      currentTable.rows = [...dataRows];
      tables.push(currentTable);
    }

    return tables;
  }

  private static isLikelyHeaderRow(
    row: string[],
    isFirstRow: boolean
  ): boolean {
    const nonEmptyCells = row.filter((cell) => cell.length > 0);
    if (nonEmptyCells.length === 0) return false;

    // First row is more likely to be header
    if (isFirstRow) return true;

    // Check for common header patterns
    const hasHeaderKeywords = row.some((cell) => {
      const lower = cell.toLowerCase();
      return (
        lower.includes("type") ||
        lower.includes("section") ||
        lower.includes("duration") ||
        lower.includes("classification") ||
        lower.includes("details") ||
        lower.includes("number") ||
        lower.includes("total") ||
        lower.includes("oh") || // Common in this dataset
        lower.includes("mamit") ||
        lower.includes("champhai") ||
        lower.includes("aizawl")
      );
    });

    if (hasHeaderKeywords) return true;

    // Check if most cells contain text (not just numbers)
    const textCells = nonEmptyCells.filter((cell) => {
      const trimmed = cell.trim();
      return (
        (isNaN(Number(trimmed)) || cell.includes(" ") || cell.length > 10) &&
        !trimmed.match(/^Column \d+$/) // Exclude auto-generated column names
      );
    });

    return textCells.length > nonEmptyCells.length * 0.6;
  }

  private static extractTableTitle(
    headerRow: string[],
    rowIndex: number,
    allData: any[][]
  ): string {
    // Try to find a meaningful title from the header row
    const nonEmptyHeaders = headerRow.filter((cell) => cell.length > 0);

    if (nonEmptyHeaders.length === 1) {
      return nonEmptyHeaders[0];
    }

    // Look for section identifiers in the first few cells
    const firstCell = headerRow[0];
    if (firstCell && firstCell.length > 0 && firstCell.length < 50) {
      return firstCell;
    }

    return `Table ${rowIndex + 1}`;
  }

  private static createMarkdownTable(
    headers: string[],
    rows: string[][]
  ): string {
    if (rows.length === 0) return "";

    // Clean up headers and rows by removing empty trailing columns
    const { cleanHeaders, cleanRows } = this.cleanupTableColumns(headers, rows);

    if (cleanRows.length === 0) return "";

    let markdown = "";

    // Ensure all rows have the same number of columns
    const maxColumns = Math.max(
      cleanHeaders.length,
      ...cleanRows.map((row) => row.length)
    );

    // If no headers provided, use first row as headers if it looks like one
    let actualHeaders = cleanHeaders;
    let actualRows = cleanRows;

    if (cleanHeaders.length === 0 && cleanRows.length > 0) {
      actualHeaders = cleanRows[0].map(
        (cell, index) => cell || `Column ${index + 1}`
      );
      actualRows = cleanRows.slice(1);
    }

    // Pad headers to match max columns
    while (actualHeaders.length < maxColumns) {
      actualHeaders.push(`Column ${actualHeaders.length + 1}`);
    }

    // Create header row
    markdown +=
      "| " + actualHeaders.map((header) => header || "").join(" | ") + " |\n";

    // Create separator row
    markdown += "| " + actualHeaders.map(() => "---").join(" | ") + " |\n";

    // Create data rows
    for (const row of actualRows) {
      const paddedRow = [...row];
      while (paddedRow.length < maxColumns) {
        paddedRow.push("");
      }
      markdown +=
        "| " +
        paddedRow.map((cell) => (cell || "").toString()).join(" | ") +
        " |\n";
    }

    return markdown;
  }

  private static cleanupTableColumns(
    headers: string[],
    rows: string[][]
  ): { cleanHeaders: string[]; cleanRows: string[][] } {
    if (rows.length === 0) {
      return { cleanHeaders: headers, cleanRows: rows };
    }

    // Find the rightmost column that has meaningful data
    const allRows = headers.length > 0 ? [headers, ...rows] : rows;
    let lastMeaningfulColumn = 0;

    for (let col = 0; col < Math.max(...allRows.map((r) => r.length)); col++) {
      let hasData = false;
      for (const row of allRows) {
        const cell = row[col] || "";
        const trimmed = cell.toString().trim();
        if (
          trimmed &&
          trimmed !== "Column " + (col + 1) &&
          trimmed !== "-" &&
          trimmed !== "N.A" &&
          trimmed !== "NIL"
        ) {
          hasData = true;
          break;
        }
      }
      if (hasData) {
        lastMeaningfulColumn = col;
      }
    }

    // Clean headers and rows to only include columns up to the last meaningful one
    const cleanHeaders = headers.slice(0, lastMeaningfulColumn + 1);
    const cleanRows = rows.map((row) => row.slice(0, lastMeaningfulColumn + 1));

    return { cleanHeaders, cleanRows };
  }

  private static convertHtmlToMarkdown(html: string): string {
    // First, handle tables specifically since they need special processing
    html = this.convertTablesToMarkdown(html);

    // Convert HTML to Markdown using a comprehensive converter
    let markdown = html
      // Convert headers
      .replace(
        /<h([1-6])>/g,
        (match, level) => "#".repeat(parseInt(level)) + " "
      )
      .replace(/<\/h[1-6]>/g, "\n\n")
      // Convert paragraphs
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "\n\n")
      // Convert strong/bold
      .replace(/<strong>/g, "**")
      .replace(/<\/strong>/g, "**")
      .replace(/<b>/g, "**")
      .replace(/<\/b>/g, "**")
      // Convert emphasis/italic
      .replace(/<em>/g, "*")
      .replace(/<\/em>/g, "*")
      .replace(/<i>/g, "*")
      .replace(/<\/i>/g, "*")
      // Convert underline
      .replace(/<u>/g, "<u>")
      .replace(/<\/u>/g, "</u>")
      // Convert strikethrough
      .replace(/<s>/g, "~~")
      .replace(/<\/s>/g, "~~")
      .replace(/<strike>/g, "~~")
      .replace(/<\/strike>/g, "~~")
      .replace(/<del>/g, "~~")
      .replace(/<\/del>/g, "~~")
      // Convert lists
      .replace(/<ul>/g, "")
      .replace(/<\/ul>/g, "\n")
      .replace(/<ol>/g, "")
      .replace(/<\/ol>/g, "\n")
      .replace(/<li>/g, "- ")
      .replace(/<\/li>/g, "\n")
      // Convert links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g, "[$2]($1)")
      // Convert line breaks
      .replace(/<br\s*\/?>/g, "\n")
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, "")
      // Clean up whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Clean up excessive asterisks (fix for multiple bold tags)
    markdown = markdown
      .replace(/\*\*\*\*\*\*/g, "**") // Fix 6 asterisks to 2
      .replace(/\*\*\*\*/g, "**") // Fix 4 asterisks to 2
      .replace(/\*\*\*\*/g, "**"); // Fix 3 asterisks to 2 (in case of odd numbers)

    return markdown;
  }

  private static convertTablesToMarkdown(html: string): string {
    // Find all tables in the HTML
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;

    return html.replace(tableRegex, (tableMatch) => {
      // Extract table content
      const tableContent =
        tableMatch.match(/<table[^>]*>([\s\S]*?)<\/table>/i)?.[1] || "";

      // Extract rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows: string[] = [];
      let match;

      while ((match = rowRegex.exec(tableContent)) !== null) {
        const rowContent = match[1];

        // Extract cells (both th and td)
        const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
        const cells: string[] = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          let cellContent = cellMatch[1]
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();

          // Handle empty cells
          if (!cellContent) {
            cellContent = " ";
          }

          cells.push(cellContent);
        }

        if (cells.length > 0) {
          rows.push("| " + cells.join(" | ") + " |");
        }
      }

      if (rows.length === 0) {
        return "\n\n_Empty table_\n\n";
      }

      // Create markdown table
      let markdownTable = "\n\n";

      // Add first row (usually headers)
      markdownTable += rows[0] + "\n";

      // Add separator row
      const firstRowCells = rows[0].split("|").length - 2; // -2 for the empty start/end
      const separator = "|" + " --- |".repeat(firstRowCells);
      markdownTable += separator + "\n";

      // Add remaining rows
      for (let i = 1; i < rows.length; i++) {
        markdownTable += rows[i] + "\n";
      }

      markdownTable += "\n";

      return markdownTable;
    });
  }

  private static countWords(text: string): number {
    // Simple word counting: split by whitespace and filter out empty strings
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  static async parseDocument(file: File): Promise<ParsedDocument> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "docx":
        return this.parseWordDocument(buffer);
      case "xlsx":
      case "xls":
        return this.parseExcelDocument(buffer);
      default:
        throw new Error(
          `Unsupported file type: ${extension}. Please upload Word (.docx) or Excel (.xlsx, .xls) files only.`
        );
    }
  }
}
