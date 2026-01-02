import { supabaseAdmin, validateSupabaseStorage } from "./supabase";

const BUCKET_NAME = "chapters_pdf";

/**
 * Uploads a chapter PDF to Supabase Storage.
 * @param fileBuffer The PDF file buffer
 * @param fileName Name of the file in storage
 * @returns The public URL of the uploaded PDF
 */
export async function uploadChapterPdf(
    fileBuffer: Buffer,
    fileName: string
): Promise<string> {
    console.log(`[PDF-SERVICE] Uploading ${fileName} to ${BUCKET_NAME}...`);

    // Validate connection first
    const validation = await validateSupabaseStorage(BUCKET_NAME);

    if (!validation.connected) {
        throw new Error(`Supabase Storage connection failed: ${validation.error}`);
    }

    if (!validation.bucketExists) {
        // Attempt to create bucket if it doesn't exist (optional, but good for robustness)
        // For now, assume admin has created it as per previous setup patterns
        throw new Error(`Supabase Storage bucket '${BUCKET_NAME}' does not exist.`);
    }

    if (!supabaseAdmin) throw new Error("Supabase Admin not initialized");

    const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
            contentType: "application/pdf",
            upsert: true,
        });

    if (error) {
        console.error(`[PDF-SERVICE] Upload error for ${fileName}:`, error);
        throw error;
    }

    console.log(`[PDF-SERVICE] ✅ Successfully uploaded ${fileName}`);

    const {
        data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return publicUrl;
}

/**
 * Note: PDF splitting logic can be added here if needed using a library like pdf-lib.
 * For now, we utilize the buffer provided by the processor.
 */
