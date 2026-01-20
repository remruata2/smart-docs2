/**
 * PDF Generation Service for Textbook Generator
 * Generates PDFs for individual chapters and compiles books
 * Stores files in Supabase Storage
 */

import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import type {
  ChapterPDFResult,
  BookCompilationRequest,
  BookCompilationResult
} from './types';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

// Dynamic import for puppeteer (only on server)
async function getPuppeteer() {
  const puppeteer = await import('puppeteer');
  return puppeteer.default;
}

/**
 * Convert markdown to HTML with styling and Math support
 */
async function markdownToHtml(markdown: string, chapterTitle: string, chapterNumber: string): Promise<string> {
  // Parse markdown with Math and GFM support
  const file = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  const contentHtml = String(file);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Georgia', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a365d;
    }
    h1 {
      font-size: 24pt;
      border-bottom: 2px solid #1a365d;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    h2 {
      font-size: 16pt;
      color: #2c5282;
      margin-top: 24px;
      border-left: 4px solid #2c5282;
      padding-left: 10px;
    }
    h3 {
      font-size: 14pt;
      color: #2d3748;
      margin-top: 20px;
    }
    .chapter-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
    }
    .chapter-number {
      font-size: 14pt;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.9;
    }
    .chapter-title {
      font-size: 28pt;
      font-weight: bold;
      margin: 10px 0;
      line-height: 1.2;
    }
    blockquote {
      background: #f7fafc;
      border-left: 4px solid #4299e1;
      padding: 10px 20px;
      margin: 16px 0;
      font-style: italic;
      color: #4a5568;
    }
    code {
      background: #edf2f7;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #e53e3e;
    }
    pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    ul, ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    li {
      margin: 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #cbd5e0;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f7fafc;
      font-weight: bold;
      color: #2d3748;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 20px auto;
      display: block;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .katex { font-size: 1.1em; }
  </style>
</head>
<body>
  <div class="chapter-header">
    <div class="chapter-number">Chapter ${chapterNumber}</div>
    <div class="chapter-title">${chapterTitle}</div>
  </div>
  
  <div class="content">
    ${contentHtml}
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
        renderMathInElement(document.body, {
          delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError : false
        });
    });
  </script>
</body>
</html>`;
}

/**
 * Generate PDF for a single chapter
 */
export async function generateChapterPDF(
  chapterId: number
): Promise<{ success: true; result: ChapterPDFResult } | { success: false; error: string }> {
  try {
    // Get chapter with content
    const chapter = await prisma.textbookChapter.findUnique({
      where: { id: chapterId },
      include: {
        images: {
          where: { status: 'COMPLETED' },
          orderBy: { order: 'asc' },
        },
        unit: {
          include: { textbook: true },
        },
      },
    });

    if (!chapter) {
      return { success: false, error: 'Chapter not found' };
    }

    if (!chapter.content) {
      return { success: false, error: 'Chapter has no content to convert to PDF' };
    }

    // Replace image placeholders with embedded base64 images for self-contained PDF
    let content = chapter.content;

    // Deduplicate consecutive [IMAGE:] tags (AI sometimes duplicates them)
    content = content.replace(/(\[IMAGE:[^\]]+\])\s*\1+/g, '$1');

    console.log(`[PDF-GEN] Found ${chapter.images.length} images in database`);
    console.log(`[PDF-GEN] Content has ${(content.match(/\[IMAGE:/g) || []).length} [IMAGE:] tags (after dedup)`);

    // Fetch all images in parallel for speed
    console.log(`[PDF-GEN] Fetching ${chapter.images.length} images in parallel...`);

    const imageDataPromises = chapter.images
      .filter(img => img.url && img.placement)
      .map(async (image, idx) => {
        try {
          console.log(`[PDF-GEN] [${idx + 1}/${chapter.images.length}] Fetching image: ${image.url}`);
          const imageResponse = await fetch(image.url!);
          if (!imageResponse.ok) {
            console.error(`[PDF-GEN] Failed to fetch image ${image.id}: ${imageResponse.status}`);
            return null;
          }
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');
          const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
          return {
            image,
            base64Image,
            mimeType,
          };
        } catch (error) {
          console.error(`[PDF-GEN] Error fetching image ${image.id}:`, error);
          return null;
        }
      });

    const imageDataResults = await Promise.all(imageDataPromises);
    const successfulImages = imageDataResults.filter(Boolean);
    console.log(`[PDF-GEN] Successfully fetched ${successfulImages.length}/${chapter.images.length} images`);

    // Now replace placeholders with the fetched images
    for (const imageData of successfulImages) {
      if (!imageData) continue;

      const { image, base64Image, mimeType } = imageData;
      const dataUri = `data:${mimeType};base64,${base64Image}`;

      // Extract the core ID from the placement field
      const coreId = image.placement!
        .replace(/\[IMAGE:\s*/i, '')
        .replace(/\]/g, '')
        .trim();

      console.log(`[PDF-GEN] Embedding image "${coreId}" (${Math.round(base64Image.length / 1024)}KB)`);

      // Create a regex that matches [IMAGE: coreId] case-insensitively with flexible whitespace
      const escapedId = coreId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexibleRegex = new RegExp(`\\[IMAGE:\\s*${escapedId}\\s*\\]`, 'gi');

      content = content.replace(
        flexibleRegex,
        `<img src="${dataUri}" alt="${image.alt_text || coreId}" style="max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px;" />`
      );
    }

    console.log(`[PDF-GEN][CHAPTER-${chapterId}] After replacement, content has ${(content.match(/<img/g) || []).length} <img> tags`);

    // Convert to HTML
    console.log(`[PDF-GEN][CHAPTER-${chapterId}] Converting Markdown to HTML...`);
    const html = await markdownToHtml(content, chapter.title, chapter.chapter_number);
    console.log(`[PDF-GEN][CHAPTER-${chapterId}] HTML conversion complete (${Math.round(html.length / 1024)}KB)`);

    // Generate PDF using Puppeteer
    console.log(`[PDF-GEN][CHAPTER-${chapterId}] Launching Puppeteer...`);
    const puppeteer = await getPuppeteer();
    console.log(`[PDF-GEN] Puppeteer loaded, launching browser...`);

    // Wrap browser launch in a timeout to catch hangs (common on servers without Chrome)
    let browser;
    try {
      // Only set explicit path on Linux (Ubuntu servers), macOS uses Puppeteer's bundled Chromium
      const isLinux = process.platform === 'linux';
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (isLinux ? '/usr/bin/chromium-browser' : undefined);

      const launchPromise = puppeteer.launch({
        headless: true,
        ...(executablePath && { executablePath }),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Overcome limited resource problems
          '--disable-gpu',
          '--single-process', // Required for some environments
        ],
      });

      // Timeout after 30 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Browser launch timed out after 30s. Chrome/Chromium may not be installed on this server.')), 30000)
      );

      browser = await Promise.race([launchPromise, timeoutPromise]) as Awaited<ReturnType<typeof puppeteer.launch>>;
    } catch (launchError) {
      const errorMsg = launchError instanceof Error ? launchError.message : 'Unknown browser launch error';
      console.error(`[PDF-GEN] BROWSER LAUNCH FAILED: ${errorMsg}`);
      console.error(`[PDF-GEN] This usually means Chrome/Chromium is not installed on the server.`);
      console.error(`[PDF-GEN] Run: sudo apt-get install chromium-browser OR install Chrome dependencies.`);
      return { success: false, error: `Browser launch failed: ${errorMsg}` };
    }

    console.log(`[PDF-GEN] Browser launched, creating page...`);

    const page = await browser.newPage();
    console.log(`[PDF-GEN] Setting HTML content (Size: ${Math.round(html.length / 1024)}KB)...`);

    // Increased timeout to 60s for large aptitude content with many SVGs
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log(`[PDF-GEN][CHAPTER-${chapterId}] Generating PDF buffer...`);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    });
    console.log(`[PDF-GEN][CHAPTER-${chapterId}] PDF buffer created (${pdfBuffer.length} bytes), closing browser...`);

    await browser.close();
    console.log(`[PDF-GEN][CHAPTER-${chapterId}] Browser closed, uploading to Supabase...`);

    // Upload to Supabase
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase not configured' };
    }

    const textbook = chapter.unit.textbook;
    const timestamp = Date.now();
    const filename = `textbooks/${textbook.id}/chapters/chapter-${chapter.id}-${timestamp}.pdf`;

    // Ensure bucket exists
    const bucketName = 'textbook_pdfs';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find(b => b.name === bucketName)) {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[PDF-GEN] Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('textbook_pdfs')
      .getPublicUrl(filename);

    // Update chapter with PDF URL
    await prisma.textbookChapter.update({
      where: { id: chapterId },
      data: {
        pdf_url: urlData.publicUrl,
        generated_at: new Date(),
      },
    });

    console.log(`[PDF-GEN] Generated PDF for chapter ${chapterId}: ${urlData.publicUrl}`);

    return {
      success: true,
      result: {
        chapter_id: chapterId,
        pdf_url: urlData.publicUrl,
        file_size: pdfBuffer.length,
        page_count: 1, // Puppeteer doesn't easily give page count
        generated_at: new Date(),
      },
    };

  } catch (error) {
    console.error('[PDF-GEN] Error generating chapter PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

/**
 * Compile multiple chapters into a complete book PDF
 */
export async function compileBookPDF(
  request: BookCompilationRequest
): Promise<{ success: true; result: BookCompilationResult } | { success: false; error: string }> {
  try {
    const { textbook_id, chapter_ids, options } = request;
    const {
      include_cover = true,
      include_toc = true,
      include_index = false
    } = options || { include_cover: true, include_toc: true, include_index: false };

    // Get textbook
    const textbook = await prisma.textbook.findUnique({
      where: { id: textbook_id },
    });

    if (!textbook) {
      return { success: false, error: 'Textbook not found' };
    }

    // Get selected chapters
    const chapters = await prisma.textbookChapter.findMany({
      where: {
        id: { in: chapter_ids },
        content: { not: null },
      },
      include: {
        images: {
          where: { status: 'COMPLETED' },
          orderBy: { order: 'asc' },
        },
        unit: true,
      },
      orderBy: [
        { unit: { order: 'asc' } },
        { order: 'asc' },
      ],
    });

    if (chapters.length === 0) {
      return { success: false, error: 'No chapters with content found' };
    }

    // Build complete HTML
    let fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05" crossorigin="anonymous"></script>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: 'Georgia', serif; font-size: 11pt; line-height: 1.6; color: #333; }
    .cover { page-break-after: always; text-align: center; padding-top: 40%; }
    .cover h1 { font-size: 36pt; color: #1a365d; }
    .cover .author { font-size: 16pt; margin-top: 40px; color: #4a5568; }
    .toc { page-break-after: always; }
    .toc h2 { font-size: 24pt; margin-bottom: 20px; color: #2c5282; border-bottom: 2px solid #2c5282; padding-bottom: 10px; }
    .toc-item { margin: 10px 0; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
    .chapter { page-break-before: always; }
    .chapter-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
    h1, h2, h3, h4 { color: #1a365d; font-family: 'Helvetica Neue', Arial, sans-serif; }
    h1 { font-size: 24pt; border-bottom: 2px solid #1a365d; padding-bottom: 10px; margin-top: 30px; }
    h2 { font-size: 16pt; margin-top: 24px; border-left: 4px solid #2c5282; padding-left: 10px; color: #2c5282; }
    h3 { font-size: 14pt; margin-top: 20px; color: #2d3748; }
    blockquote { background: #f7fafc; border-left: 4px solid #4299e1; padding: 10px 20px; margin: 16px 0; font-style: italic; color: #4a5568; }
    code { background: #edf2f7; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9em; color: #e53e3e; }
    pre { background: #2d3748; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
    pre code { background: transparent; color: inherit; padding: 0; }
    img { max-width: 100%; height: auto; margin: 20px auto; display: block; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e0; padding: 10px; text-align: left; }
    th { background-color: #f7fafc; font-weight: bold; color: #2d3748; }
    .katex { font-size: 1.1em; }
  </style>
</head>
<body>`;

    // Cover page
    if (include_cover) {
      fullHtml += `
<div class="cover">
  <h1>${textbook.title}</h1>
  <p class="author">${textbook.author || 'MBSE Smart Textbook'}</p>
  <p>Class ${textbook.class_level}${textbook.stream ? ` • ${textbook.stream}` : ''}</p>
  <p>${textbook.academic_year || new Date().getFullYear()}</p>
</div>`;
    }

    // Table of Contents
    if (include_toc) {
      fullHtml += `
<div class="toc">
  <h2>Table of Contents</h2>
  ${chapters.map((ch, i) => `
    <div class="toc-item">
      <strong>Chapter ${ch.chapter_number}:</strong> ${ch.title}
    </div>
  `).join('')}
</div>`;
    }

    // Chapters
    for (const chapter of chapters) {
      let content = chapter.content || '';

      // Replace image placeholders
      for (const image of chapter.images) {
        if (image.url && image.placement) {
          content = content.replace(
            `[IMAGE: ${image.placement}]`,
            `<img src="${image.url}" alt="${image.alt_text || ''}" />`
          );
        }
      }

      // Markdown conversion using unified
      const file = await unified()
        .use(remarkParse)
        .use(remarkMath)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeKatex)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(content);
      const contentHtml = String(file);

      fullHtml += `
<div class="chapter">
  <div class="chapter-header">
    <small style="text-transform: uppercase; letter-spacing: 2px;">Chapter ${chapter.chapter_number}</small>
    <h1 style="color: white; margin: 10px 0; border: none; font-size: 28pt;">${chapter.title}</h1>
  </div>
  <div class="content">
    ${contentHtml}
  </div>
</div>`;
    }

    fullHtml += `
<script>
    document.addEventListener("DOMContentLoaded", function() {
        renderMathInElement(document.body, {
          delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError : false
        });
    });
</script>
</body></html>`;

    // Generate PDF
    const puppeteer = await getPuppeteer();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 120000 }); // Increased timeout for larger books

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    });

    await browser.close();

    // Upload to Supabase
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase not configured' };
    }

    const timestamp = Date.now();
    const filename = `textbooks/${textbook_id}/compiled/book-${timestamp}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('textbook_pdfs')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('textbook_pdfs')
      .getPublicUrl(filename);

    // Update textbook with compiled PDF URL
    await prisma.textbook.update({
      where: { id: textbook_id },
      data: {
        compiled_pdf_url: urlData.publicUrl,
      },
    });

    console.log(`[PDF-COMPILE] Generated book PDF: ${urlData.publicUrl}`);

    return {
      success: true,
      result: {
        textbook_id,
        pdf_url: urlData.publicUrl,
        file_size: pdfBuffer.length,
        page_count: chapters.length + (include_cover ? 1 : 0) + (include_toc ? 1 : 0),
        chapters_included: chapters.length,
        compiled_at: new Date(),
      },
    };

  } catch (error) {
    console.error('[PDF-COMPILE] Error compiling book PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compile book',
    };
  }
}
