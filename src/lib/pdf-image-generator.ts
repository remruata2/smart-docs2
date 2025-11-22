import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { supabaseAdmin } from "./supabase";
import { readFile } from "fs/promises";

/**
 * Generates JPEG images for each page of a PDF using pdftocairo.
 * @param pdfPath Path to the source PDF file
 * @param outputDir Directory to save generated images
 * @param fileId Unique identifier for the file (used for naming)
 * @returns Array of generated image file paths
 */
export async function generatePageImages(
    pdfPath: string,
    outputDir: string,
    fileId: string
): Promise<string[]> {
    console.log(`[PDF-IMG] Generating images for ${pdfPath} in ${outputDir}`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const outputPrefix = path.join(outputDir, `${fileId}`);

    // Command: pdftocairo -jpeg -scale-to 1024 <input> <output_prefix>
    // pdftocairo automatically appends -1.jpg, -2.jpg, etc.
    const child = spawn("pdftocairo", [
        "-jpeg",
        "-scale-to", "1024",
        pdfPath,
        outputPrefix
    ]);

    return new Promise((resolve, reject) => {
        let stderr = "";

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", async (code) => {
            if (code === 0) {
                try {
                    // List generated files to return them
                    const files = await fs.readdir(outputDir);
                    // Filter for files belonging to this generation
                    const imageFiles = files
                        .filter(f => f.startsWith(fileId) && f.endsWith(".jpg"))
                        .sort((a, b) => {
                            // Sort by page number: fileId-1.jpg, fileId-2.jpg
                            const numA = parseInt(a.match(/-(\d+)\.jpg$/)?.[1] || "0");
                            const numB = parseInt(b.match(/-(\d+)\.jpg$/)?.[1] || "0");
                            return numA - numB;
                        })
                        .map(f => path.join(outputDir, f));

                    console.log(`[PDF-IMG] Generated ${imageFiles.length} images`);
                    resolve(imageFiles);
                } catch (err) {
                    reject(err);
                }
            } else {
                console.error(`[PDF-IMG] pdftocairo failed code=${code}: ${stderr}`);
                reject(new Error(`pdftocairo exited with code ${code}`));
            }
        });

        child.on("error", (err) => {
            console.error(`[PDF-IMG] Spawn error:`, err);
            reject(err);
        });
    });
}

/**
 * Uploads page images to Supabase Storage.
 * @param imagePaths Array of local paths to image files
 * @param folderName Folder in bucket to store images (e.g., chapter-id or book-id)
 * @returns Map of page number to public URL
 */
export async function uploadPageImages(
    imagePaths: string[],
    folderName: string
): Promise<Map<number, string>> {
    const pageUrlMap = new Map<number, string>();
    const BUCKET_NAME = "chapter_pages";

    // Ensure bucket exists (optional, usually done in setup)
    // await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true }).catch(() => {});

    console.log(`[PDF-IMG] Uploading ${imagePaths.length} images to ${BUCKET_NAME}/${folderName}`);

    // Upload in parallel with concurrency limit
    const CONCURRENCY = 5;
    const chunks = [];
    for (let i = 0; i < imagePaths.length; i += CONCURRENCY) {
        chunks.push(imagePaths.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (imagePath) => {
            try {
                const filename = path.basename(imagePath);
                // Extract page number from filename (e.g., fileId-1.jpg -> 1)
                const pageMatch = filename.match(/-(\d+)\.jpg$/);
                if (!pageMatch) return;

                const pageNum = parseInt(pageMatch[1]);
                const storagePath = `${folderName}/${filename}`;
                const fileBuffer = await readFile(imagePath);

                const { error } = await supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .upload(storagePath, fileBuffer, {
                        contentType: "image/jpeg",
                        upsert: true
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(storagePath);

                pageUrlMap.set(pageNum, publicUrl);
            } catch (error) {
                console.error(`[PDF-IMG] Failed to upload ${imagePath}:`, error);
            }
        }));
    }

    return pageUrlMap;
}
