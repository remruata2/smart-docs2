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

    // Initialize and use the LlamaParse parser
    const parser = new LlamaParseDocumentParser();
    const content = await parser.parseFile(tempFilePath);

    console.log(
      "[PARSE-DOCUMENT] Document parsed successfully with LlamaParse"
    );

    // Track file upload usage
    await trackUsage(userId, UsageType.file_upload);

    return NextResponse.json({ success: true, content });
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
