import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { LlamaParseDocumentParser } from "@/lib/llamaparse-document-parser";
import { enforceUsageLimit } from "@/lib/usage-limits";
import { trackUsage } from "@/lib/usage-tracking";
import { UsageType } from "@/generated/prisma";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[PARSE-DOCUMENT] API called");

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id as string);

  // Check usage limit before processing
  const limitCheck = await enforceUsageLimit(UsageType.file_upload, userId);
  if (!limitCheck.success) {
    return NextResponse.json(
      { error: limitCheck.error, limitExceeded: true },
      { status: limitCheck.status }
    );
  }

  let tempFilePath: string | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 50MB. Your file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
        },
        { status: 413 }
      );
    }

    // Create a temporary file path
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `upload_${Date.now()}_${file.name}`);

    // Save the uploaded file to the temporary path
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, fileBuffer);
    console.log(`[PARSE-DOCUMENT] File saved temporarily to ${tempFilePath}`);

    // Get parser selection from form data
    const parserType = formData.get("parser") as string | null;
    console.log(`[PARSE-DOCUMENT] Selected parser: ${parserType || "llamaparse"}`);

    let content = "";
    let pages: any[] = [];

    // 1. Generate Page Images (if PDF)
    const fileId = Date.now(); // Temporary ID for storage path, real ID comes from DB later
    // In a real app, we'd create the FileList record first to get the ID.
    // For now, we'll use a timestamp-based folder in public/files
    const publicDir = path.join(process.cwd(), "public", "files", String(fileId));
    await fs.mkdir(publicDir, { recursive: true });

    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        // Use system-installed pdftocairo directly via child_process
        // This avoids issues with the pdf-poppler package binaries in serverless/Next.js environments
        const { spawn } = await import("child_process");

        console.log(`[PARSE-DOCUMENT] Generating images using system pdftocairo...`);

        // Command: pdftocairo -jpeg -scale-to 1024 <input> <output_prefix>
        // Note: pdftocairo automatically appends -1.jpg, -2.jpg etc. to the prefix
        const child = spawn("pdftocairo", [
          "-jpeg",
          "-scale-to", "1024",
          tempFilePath,
          path.join(publicDir, "page")
        ]);

        await new Promise<void>((resolve, reject) => {
          child.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`pdftocairo exited with code ${code}`));
            }
          });

          child.on("error", (err) => {
            reject(err);
          });

          // Optional: Log stderr for debugging
          child.stderr.on("data", (data) => {
            console.error(`[pdftocairo stderr]: ${data}`);
          });
        });

        console.log(`[PARSE-DOCUMENT] Generated page images in ${publicDir}`);
      } catch (imgError) {
        console.error("[PARSE-DOCUMENT] Failed to generate images:", imgError);
        // Continue without images if this fails
      }
    }

    if (parserType === "docling") {
      // Use Docling parser
      const { convertFileWithDocling } = await import("@/lib/docling-client");
      const doclingContent = await convertFileWithDocling(tempFilePath);

      if (!doclingContent) {
        throw new Error("Docling parsing failed to return content");
      }
      content = doclingContent;
      console.log("[PARSE-DOCUMENT] Document parsed successfully with Docling");
    } else {
      // Default to LlamaParse
      const parser = new LlamaParseDocumentParser();
      const result = await parser.parseFile(tempFilePath);

      if (Array.isArray(result)) {
        // Handle JSON output
        pages = result;
        // Use markdown format, fallback to text if markdown is not available
        content = result.map((page: any) => page.md || page.text).join("\n\n");
        console.log(`[PARSE-DOCUMENT] Parsed ${pages.length} pages with LlamaParse`);
      } else {
        // Fallback for string output
        content = result;
      }
    }

    // Track file upload usage
    await trackUsage(userId, UsageType.file_upload);

    // Return structured data including the temporary file ID for image mapping
    return NextResponse.json({
      success: true,
      content,
      fileId: fileId, // Pass this back so the client can associate images
      pages: pages.map((p: any, i: number) => ({
        pageNumber: i + 1,
        text: p.text, // Keep text for backward compatibility
        markdown: p.md || p.text, // Use markdown format, fallback to text
        layout: p.items, // LlamaParse layout items
        width: p.width, // Page width in PDF points (if available)
        height: p.height // Page height in PDF points (if available)
      }))
    });
  } catch (error) {
    console.error("[PARSE-DOCUMENT] Error:", error);
    console.error(
      "[PARSE-DOCUMENT] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    // Clean up the temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`[PARSE-DOCUMENT] Deleted temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(
          `[PARSE-DOCUMENT] Error deleting temporary file ${tempFilePath}:`,
          cleanupError
        );
      }
    }
  }
}
