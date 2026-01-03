'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { supabaseAdmin } from "@/lib/supabase";

export async function uploadImageAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const file = formData.get("file") as File;
        if (!file) {
            return { success: false, error: "No file provided" };
        }

        if (!file.type.startsWith("image/")) {
            return { success: false, error: "File must be an image" };
        }

        // Limit file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return { success: false, error: "File size must be less than 5MB" };
        }

        if (!supabaseAdmin) {
            return { success: false, error: "Storage service not configured" };
        }

        const bucketName = "profile_pictures";

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.find(b => b.name === bucketName)) {
            const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 10485760, // 10MB
            });
            if (createError) {
                console.error("[UPLOAD-ACTION] Failed to create bucket:", createError);
                return { success: false, error: "Failed to initialize storage" };
            }
        }

        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { data, error: uploadError } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error("[UPLOAD-ACTION] Supabase upload error:", uploadError);
            return { success: false, error: uploadError.message };
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return { success: true, url: publicUrl };

    } catch (error: any) {
        console.error("[UPLOAD-ACTION] Unhandled error:", error);
        return { success: false, error: error.message || "An unexpected error occurred" };
    }
}
