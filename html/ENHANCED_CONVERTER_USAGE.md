# Enhanced HTML → Markdown Converter

This document explains how to run `enhanced-html-converter.js` to convert HTML files to compact Markdown in `cid-ai/html/`.

## What it does
- Converts each `*.html` file to `*-enhanced.md` in the same folder.
- Extracts headings, paragraphs, tables (with normalized col/row spans), lists, line breaks, and horizontal rules.
- Images are represented concisely as placeholders like `[Image: filename (Position)]`.
- Logs a per-file summary and a final conversion summary.

## Basic usage
From the `cid-ai/html/` directory:

```bash
node enhanced-html-converter.js
```

- Processes all `*.html` files in numeric order (e.g., `2.html` before `10.html`).
- Output files: `XXXX-enhanced.md` (same stem as input).

If you need a larger Node heap (useful for very large batches), you can run:

```bash
node --max-old-space-size=8192 enhanced-html-converter.js
```

## Flags

You can combine flags with the memory option, for example:

```bash
node --max-old-space-size=8192 enhanced-html-converter.js --start-file 3000.html
```

- `--start-file <filename>`
  - Resume after a specific HTML file.
  - Example: start after `2031.html`:
    ```bash
    node enhanced-html-converter.js --start-file 2031.html
    ```

- `--start-index <n>`
  - Resume at 1-based position in the sorted file list.
  - Example: start at the 957th file:
    ```bash
    node enhanced-html-converter.js --start-index 957
    ```

- `--only-file <filename>`
  - Process a single HTML file and exit. Ignores resume flags.
  - Example:
    ```bash
    node enhanced-html-converter.js --only-file 4032.html
    ```

## Notes
- Files are sorted numerically (natural sort) before processing.
- Converted Markdown files are written alongside the source HTML.
- The script is idempotent; re-running will overwrite existing `*-enhanced.md` files for processed inputs.

## Performance tips
- For very large batches, you can process in chunks using `--start-file` or `--start-index`.
- You can increase the Node heap if your environment is memory constrained:
  ```bash
  node --max-old-space-size=8192 enhanced-html-converter.js
  ```
  or combine with resume flags, e.g.:
  ```bash
  node --max-old-space-size=8192 enhanced-html-converter.js --start-file 3000.html
  ```

## Examples
- Convert everything:
  ```bash
  node enhanced-html-converter.js
  ```
- Resume after a file:
  ```bash
  node enhanced-html-converter.js --start-file 1865.html
  ```
- Resume at an index:
  ```bash
  node enhanced-html-converter.js --start-index 2000
  ```
- Convert one file only:
  ```bash
  node enhanced-html-converter.js --only-file 2031.html
  ```

## Output interpretation
For each file you’ll see something like:
```
✅ Success: 2207-enhanced.md
📊 425583 bytes → 10706 bytes
📋 4 headings, 57 paragraphs, 1 tables, 0 lists, 1 images (46 rows)
💾 Reduction: 97.5%
```
- The last number in parentheses after tables is the total data rows extracted.
- Reduction shows the size delta from input HTML to output Markdown.

## Troubleshooting
- Ensure you run commands inside `cid-ai/html/`.
- If a flag takes a filename, include the `.html` extension and a space after the flag name (e.g., `--start-file 2031.html`).
- If you see memory errors on very large runs, process in chunks or increase the heap as shown above.
