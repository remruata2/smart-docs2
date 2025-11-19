/*
Environment-agnostic HTML → Markdown converter refactored from
cid-ai/html/enhanced-html-converter.js

Exports a single function:
  htmlToMarkdown(html: string): string

Notes:
- Uses DOMParser in the browser.
- In Node (optional), attempts to use jsdom if present. If not available, falls back to a minimal parser that strips tags.
- Focuses on paragraphs, headings, lists, tables (incl. colspan/rowspan normalization), br/hr, and images (as placeholders).
*/

export function htmlToMarkdown(html: string): string {
  try {
    const document = getDocument(html);
    const content = processHTMLDocument(document);
    const markdown = contentToMarkdown(content);
    return markdown.trim();
  } catch {
    // Robust fallback: strip tags and return plain text
    const text = stripHtmlToText(html);
    return text.trim();
  }
}

// ---------------------- Parsing helpers ----------------------

function getDocument(htmlContent: string): Document {
  // Browser-only parser using DOMParser. We intentionally avoid jsdom to keep this module client-safe.
  if (typeof window !== "undefined" && typeof (window as any).DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    return doc;
  }
  // If no DOM available (e.g., server), signal to caller to use fallback text stripping.
  throw new Error("DOMParser not available in this environment");
}

// ---------------------- AST builders ----------------------

type ContentItem =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "table"; data: TableData }
  | { type: "list"; data: ListData }
  | { type: "linebreak" }
  | { type: "horizontalrule" }
  | { type: "image"; data: ImageData };

type TableData = {
  headers: string[];
  rows: string[][];
  columnCount: number;
};

type ListData = {
  type: "ol" | "ul";
  items: string[];
};

type ImageData = {
  src: string;
  alt: string;
  title: string;
  style: string;
  placeholder: string;
  originalSrc: string;
};

function processHTMLDocument(document: Document): ContentItem[] {
  const content: ContentItem[] = [];

  // Pending list accumulator for bullet-like paragraphs
  let pendingListType: "ul" | "ol" | null = null;
  let pendingListItems: string[] = [];
  const flushPendingList = () => {
    if (pendingListType && pendingListItems.length > 0) {
      content.push({ type: "list", data: { type: pendingListType, items: pendingListItems } });
    }
    pendingListType = null;
    pendingListItems = [];
  };

  // Select elements in reading order
  const allElements = document.querySelectorAll(
    "p, table, h1, h2, h3, h4, h5, h6, ol, ul, br, hr, img"
  );

  const isBulletParagraph = (el: HTMLElement): { type: "ul" | "ol"; stripped: string } | null => {
    const raw = (el.textContent || "").replace(/\u00A0/g, " ").trimStart();
    // Unordered markers: bullets, middle dot, small circle, dash variants
    const ulMatch = raw.match(/^([\u2022\u00B7\u25E6\-\–\—]+)\s+(.*)$/);
    if (ulMatch) return { type: "ul", stripped: ulMatch[2] };
    // Ordered markers: 1. 1) a. a) i. i)
    const olMatch = raw.match(/^(?:((?:\d+|[a-zA-Z]+|[ivxlcdmIVXLCDM]+))[\.)])\s+(.*)$/);
    if (olMatch) return { type: "ol", stripped: olMatch[2] };
    return null;
  };

  allElements.forEach((element) => {
    const tag = element.tagName;

    if (tag === "P") {
      if ((element as HTMLElement).closest("td, th")) return; // skip paragraphs inside tables

      // Detect bullet/ordered markers BEFORE sanitization
      const bullet = isBulletParagraph(element as HTMLElement);
      if (bullet) {
        const itemText = sanitizeListItemText(getCleanText(element as HTMLElement));
        if (itemText) {
          if (pendingListType !== bullet.type) {
            flushPendingList();
            pendingListType = bullet.type;
          }
          pendingListItems.push(itemText);
        }
        return;
      }

      // Non-list paragraph: flush any pending list
      flushPendingList();

      let text = getCleanText(element as HTMLElement);
      text = sanitizeLeadingGlyphs(text);
      if (!text) return;

      if (shouldBeHeading(element as HTMLElement, text)) {
        content.push({ type: "heading", text });
      } else {
        content.push({ type: "paragraph", text });
      }
      return;
    }

    if (/^H[1-6]$/.test(tag)) {
      flushPendingList();
      if ((element as HTMLElement).closest("td, th")) return;
      let text = getCleanText(element as HTMLElement);
      text = sanitizeLeadingGlyphs(text);
      if (text) content.push({ type: "heading", text });
      return;
    }

    if (tag === "TABLE") {
      flushPendingList();
      const tableData = processTable(element as HTMLTableElement);
      if (tableData.headers.length > 0 || tableData.rows.length > 0) {
        content.push({ type: "table", data: tableData });
      }
      return;
    }

    if (tag === "OL" || tag === "UL") {
      flushPendingList();
      const listData = processList(element as HTMLOListElement | HTMLUListElement);
      if (listData.items.length > 0) content.push({ type: "list", data: listData });
      return;
    }

    if (tag === "BR") {
      flushPendingList();
      content.push({ type: "linebreak" });
      return;
    }

    if (tag === "HR") {
      flushPendingList();
      content.push({ type: "horizontalrule" });
      return;
    }

    if (tag === "IMG") {
      flushPendingList();
      const img = element as HTMLImageElement;
      const src = img.getAttribute("src") || "";
      if (!src) return;
      const alt = img.getAttribute("alt") || "";
      const title = img.getAttribute("title") || "";
      const style = img.getAttribute("style") || "";

      let placeholder = "Image";
      const lowerSrc = src.toLowerCase();
      if (lowerSrc.includes("clip_image")) placeholder = "Document Image";
      else if (lowerSrc.includes("signature") || lowerSrc.includes("sign")) placeholder = "Signature";
      else if (lowerSrc.includes("logo") || lowerSrc.includes("brand")) placeholder = "Logo";
      else if (lowerSrc.includes("photo") || lowerSrc.includes("pic")) placeholder = "Photo";
      else if (lowerSrc.includes("diagram") || lowerSrc.includes("chart")) placeholder = "Diagram/Chart";
      else if (lowerSrc.includes("map")) placeholder = "Map";

      if (alt) placeholder = `${placeholder}: ${alt}`;
      else if (title) placeholder = `${placeholder}: ${title}`;

      if (/(margin-left|text-align)/i.test(style)) {
        const pos = /center/i.test(style)
          ? "Centered"
          : /right/i.test(style)
          ? "Right-aligned"
          : /left/i.test(style)
          ? "Left-aligned"
          : "";
        if (pos) placeholder = `${placeholder} (${pos})`;
      }

      content.push({
        type: "image",
        data: { src, alt, title, style, placeholder, originalSrc: src },
      });
      return;
    }
  });

  // Flush any remaining pending list at the end
  flushPendingList();

  return content;
}

// Extract text content with inline strong/italic/underline formatting converted to simple markdown
function getCleanText(element: HTMLElement): string {
  // Clone to avoid mutating the original
  const clone = element.cloneNode(true) as HTMLElement;

  // Convert bold
  clone.querySelectorAll("strong, b, span[style*='font-weight']").forEach((el) => {
    wrapNodeWithMarkdown(el as HTMLElement, "**");
  });

  // Convert italic
  clone.querySelectorAll("em, i, span[style*='font-style']").forEach((el) => {
    wrapNodeWithMarkdown(el as HTMLElement, "_");
  });

  // Convert underline (map to italic for simplicity)
  clone.querySelectorAll("u, span[style*='text-decoration']").forEach((el) => {
    wrapNodeWithMarkdown(el as HTMLElement, "_");
  });

  const text = clone.innerHTML
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function wrapNodeWithMarkdown(node: HTMLElement, marker: string) {
  const text = node.textContent || "";
  const replacement = `${marker}${text.trim()}${marker}`;
  // Replace the node with its markdown equivalent
  const span = node.ownerDocument?.createElement("span");
  if (!span) return;
  span.textContent = replacement;
  node.replaceWith(span);
}

function shouldBeHeading(element: HTMLElement, text: string): boolean {
  if (!text || text.length < 3) return false;

  const hasStrong = !!(
    element.querySelector("strong") ||
    element.querySelector("b") ||
    element.querySelector("span[style*='font-weight']")
  );

  const hasUnderline = !!(
    element.querySelector("u") || element.querySelector("span[style*='text-decoration']")
  );

  const isUpperCase = text === text.toUpperCase() && text.length > 10;

  const style = (element.getAttribute("style") || "").toLowerCase();
  const isCentered = /text-align\s*:\s*center/.test(style);

  const containsKeywords =
    /\b(CONFIDENTIAL|OFFICE|SUBJECT|REPORT|STATE|PERIOD|SUMMARY|LIST|CONSTITUENCY|VOTERS|CARD|JOB|RATION|SPECIAL|DGP|SECRET|CONT)\b/i.test(
      text
    );

  const isSignature = /^\([A-Z\.\s]+\)$/.test(text.trim());

  return (
    (hasStrong && (containsKeywords || isCentered)) ||
    (hasUnderline && containsKeywords) ||
    (isUpperCase && containsKeywords) ||
    (isCentered && hasStrong) ||
    isSignature
  );
}

function processTable(tableElement: HTMLTableElement): TableData {
  const rowElements = Array.from(tableElement.querySelectorAll("tr"));

  const pendingRowSpans: number[] = [];
  const grid: string[][] = [];
  const rowHasThFlags: boolean[] = [];
  const rowHasStrongFlags: boolean[] = [];

  rowElements.forEach((rowElement) => {
    const cellElements = Array.from(rowElement.querySelectorAll<HTMLElement>("td, th"));
    if (cellElements.length === 0) return;

    const hasAnyText = cellElements.some((cell) => getCleanText(cell));
    if (!hasAnyText) return;

    const currentRow: string[] = [];
    let columnIndex = 0;

    cellElements.forEach((cell) => {
      // Advance to next free column if current slots are covered by rowspans from above
      while ((pendingRowSpans[columnIndex] || 0) > 0) {
        currentRow.push("");
        pendingRowSpans[columnIndex]!--;
        columnIndex++;
      }

      const cellText = getCleanText(cell);
      const colspan = Math.max(parseInt(cell.getAttribute("colspan") || "1", 10) || 1, 1);
      const rowspan = Math.max(parseInt(cell.getAttribute("rowspan") || "1", 10) || 1, 1);

      currentRow.push(cellText);
      for (let k = 1; k < colspan; k++) currentRow.push("");

      if (rowspan > 1) {
        for (let k = 0; k < colspan; k++) {
          const idx = columnIndex + k;
          pendingRowSpans[idx] = (pendingRowSpans[idx] || 0) + (rowspan - 1);
        }
      }

      columnIndex += colspan;
    });

    while ((pendingRowSpans[columnIndex] || 0) > 0) {
      currentRow.push("");
      pendingRowSpans[columnIndex]!--;
      columnIndex++;
    }

    grid.push(currentRow);

    rowHasThFlags.push(rowElement.querySelectorAll("th").length > 0);
    rowHasStrongFlags.push(
      cellElements.some(
        (cell) =>
          !!(
            cell.querySelector("strong") ||
            cell.querySelector("b") ||
            cell.querySelector("span[style*='font-weight']")
          )
      )
    );
  });

  let maxColumns = 0;
  grid.forEach((r) => {
    if (r.length > maxColumns) maxColumns = r.length;
  });

  const normalizedRows = grid.map((r) => {
    const out = [...r];
    while (out.length < maxColumns) out.push("");
    return out;
  });

  let headerIndex = rowHasThFlags.findIndex((v) => v);
  if (headerIndex === -1) headerIndex = rowHasStrongFlags.findIndex((v) => v);

  const tableData: TableData = { headers: [], rows: [], columnCount: maxColumns };

  if (headerIndex !== -1 && normalizedRows[headerIndex]) {
    tableData.headers = normalizedRows[headerIndex];
    tableData.rows = normalizedRows.filter((_, idx) => idx !== headerIndex);
  } else {
    tableData.rows = normalizedRows;
  }

  return tableData;
}

function sanitizeListItemText(text: string): string {
  let t = text.trim();
  const glyphClass = "[\\u2022\\u00B7\\u25E6\\u25AA\\u25AB\\-–—\\.]";
  // Iteratively strip leading patterns like **·**, **.**, * · *, __•__, or repeated sequences
  const patterns: RegExp[] = [
    new RegExp(`^(?:\\*\\*|__)+\\s*${glyphClass}+\\s*(?:\\*\\*|__)+\\s*`), // **·** / __•__
    new RegExp(`^(?:\\*|_)+\\s*${glyphClass}+\\s*(?:\\*|_)+\\s*`), // * · * / _ • _
    new RegExp(`^(?:\\*|_)+\\s*${glyphClass}+\\s*`), // * ·
    new RegExp(`^${glyphClass}+(?:\\s+|$)`), // bare glyph(s) + space or EOL
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const rx of patterns) {
      const nt = t.replace(rx, "");
      if (nt !== t) {
        t = nt.trimStart();
        changed = true;
      }
    }
  }
  return t.replace(/^\s+/, "");
}

// Remove leading decorative glyphs or punctuation accidentally bolded/italicized at start of a line,
// e.g., "**.**", "**·**", "*. *", "__•__".
function sanitizeLeadingGlyphs(text: string): string {
  let t = text.trimStart();
  const glyphClass = "[\\u2022\\u00B7\\u25E6\\u25AA\\u25AB\\-–—\\.:;]"; // include dot/colon/semicolon
  const patterns: RegExp[] = [
    new RegExp(`^(?:\\*\\*|__)+\\s*${glyphClass}+\\s*(?:\\*\\*|__)+\\s*`),
    new RegExp(`^(?:\\*|_)+\\s*${glyphClass}+\\s*(?:\\*|_)+\\s*`),
    new RegExp(`^(?:\\*|_)+\\s*${glyphClass}+\\s*`),
    new RegExp(`^${glyphClass}{1,3}(?:\\s+|$)`), // up to 3 punctuation glyphs
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const rx of patterns) {
      const nt = t.replace(rx, "");
      if (nt !== t) {
        t = nt.trimStart();
        changed = true;
      }
    }
  }
  return t;
}

function processList(listElement: HTMLOListElement | HTMLUListElement): ListData {
  const listItems = Array.from(listElement.querySelectorAll("li"));
  const data: ListData = { type: listElement.tagName.toLowerCase() as "ol" | "ul", items: [] };

  listItems.forEach((item) => {
    let text = getCleanText(item as HTMLElement);
    text = sanitizeListItemText(text);
    if (text) data.items.push(text);
  });

  return data;
}

// ---------------------- Markdown builder ----------------------

function contentToMarkdown(content: ContentItem[]): string {
  let markdown = "";

  content.forEach((item, index) => {
    if (index > 0) {
      const prev = content[index - 1];
      if (prev.type !== "linebreak" && prev.type !== "horizontalrule" && item.type !== "linebreak" && item.type !== "horizontalrule") {
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
      case "table": {
        const t = item.data;
        const cols = t.columnCount || Math.max(t.headers.length, ...t.rows.map((r) => r.length));
        if (t.headers.length > 0) {
          const headers = [...t.headers];
          while (headers.length < cols) headers.push("");
          markdown += `| ${headers.slice(0, cols).join(" | ")} |\n`;
          markdown += `| ${Array(cols).fill("---").join(" | ")} |\n`;
          t.rows.forEach((row) => {
            const r = [...row];
            while (r.length < cols) r.push("");
            markdown += `| ${r.slice(0, cols).map((c) => c || "").join(" | ")} |\n`;
          });
        } else if (t.rows.length > 0) {
          const first = [...t.rows[0]];
          while (first.length < cols) first.push("");
          markdown += `| ${first.slice(0, cols).join(" | ")} |\n`;
          markdown += `| ${Array(cols).fill("---").join(" | ")} |\n`;
          t.rows.slice(1).forEach((row) => {
            const r = [...row];
            while (r.length < cols) r.push("");
            markdown += `| ${r.slice(0, cols).map((c) => c || "").join(" | ")} |\n`;
          });
        }
        break;
      }
      case "list": {
        const l = item.data;
        l.items.forEach((txt, i) => {
          if (i > 0) markdown += "\n";
          if (l.type === "ol") markdown += `${i + 1}. ${txt}`;
          else markdown += `- ${txt}`;
        });
        break;
      }
      case "linebreak":
        markdown += "\n";
        break;
      case "horizontalrule":
        markdown += "\n---\n";
        break;
      case "image":
        markdown += `[${item.data.placeholder}]`;
        break;
    }
  });

  return markdown.trim();
}

// ---------------------- Utilities ----------------------

function stripHtmlToText(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
