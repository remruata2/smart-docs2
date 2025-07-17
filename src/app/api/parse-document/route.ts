import { NextRequest, NextResponse } from "next/server";
import { DocumentParser } from "@/lib/document-parser";

export const runtime = "nodejs"; // Ensure this runs on the Node.js runtime
export const dynamic = "force-dynamic"; // Prevent static optimization

export async function POST(req: NextRequest) {
  console.log("[PARSE-DOCUMENT] API called");

  try {
    const formData = await req.formData();
    console.log("[PARSE-DOCUMENT] FormData received");

    const file = formData.get("file");
    console.log(
      "[PARSE-DOCUMENT] File from formData:",
      file ? "File object present" : "No file"
    );

    if (!file || typeof file === "string") {
      console.log("[PARSE-DOCUMENT] Error: No valid file uploaded");
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    // Type assertion for the file
    const uploadedFile = file as File;
    console.log("[PARSE-DOCUMENT] File details:", {
      name: uploadedFile.name,
      size: uploadedFile.size,
      type: uploadedFile.type,
    });

    const parsed = await DocumentParser.parseDocument(uploadedFile);
    console.log("[PARSE-DOCUMENT] Document parsed successfully");

    return NextResponse.json({ success: true, ...parsed });
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
  }
}
