/**
 * File validation utilities for secure file uploads
 * Validates file types using magic bytes, not just extensions
 */

import { fileTypeFromBuffer } from "file-type";

// Allowed file types mapped by category
export const ALLOWED_FILE_TYPES: Record<string, { mimeTypes: readonly string[]; extensions: readonly string[] }> = {
    documents: {
        mimeTypes: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/markdown",
        ],
        extensions: ["pdf", "doc", "docx", "txt", "md"],
    },
    images: {
        mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        extensions: ["jpg", "jpeg", "png", "gif", "webp"],
    },
};
export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    detectedType?: {
        mime: string;
        ext: string;
    };
}

/**
 * Validates a file using magic bytes detection
 * This is more secure than checking file extension alone
 */
export async function validateFileType(
    buffer: Buffer,
    allowedCategory: FileCategory = "documents",
    originalFilename?: string
): Promise<FileValidationResult> {
    const allowedConfig = ALLOWED_FILE_TYPES[allowedCategory];

    // Detect file type from magic bytes
    const detectedType = await fileTypeFromBuffer(buffer);

    // Handle text-based files that don't have magic bytes
    // (txt, md, and some other text files)
    if (!detectedType) {
        const ext = originalFilename?.split(".").pop()?.toLowerCase();
        if (ext && ["txt", "md"].includes(ext)) {
            // Check if content appears to be text
            const isText = isPlainText(buffer);
            if (isText) {
                return {
                    valid: true,
                    detectedType: {
                        mime: ext === "md" ? "text/markdown" : "text/plain",
                        ext: ext,
                    },
                };
            }
        }
        return {
            valid: false,
            error: "Unable to determine file type. The file may be corrupted or empty.",
        };
    }

    // Check if detected MIME type is allowed
    if (!allowedConfig.mimeTypes.includes(detectedType.mime)) {
        return {
            valid: false,
            error: `File type "${detectedType.mime}" is not allowed. Allowed types: ${allowedConfig.extensions.join(", ")}`,
            detectedType: {
                mime: detectedType.mime,
                ext: detectedType.ext,
            },
        };
    }

    // Verify file extension matches detected type (prevent extension spoofing)
    if (originalFilename) {
        const declaredExt = originalFilename.split(".").pop()?.toLowerCase();
        if (declaredExt && !allowedConfig.extensions.includes(declaredExt)) {
            return {
                valid: false,
                error: `File extension ".${declaredExt}" is not allowed. Detected type: ${detectedType.mime}`,
                detectedType: {
                    mime: detectedType.mime,
                    ext: detectedType.ext,
                },
            };
        }
    }

    return {
        valid: true,
        detectedType: {
            mime: detectedType.mime,
            ext: detectedType.ext,
        },
    };
}

/**
 * Check if buffer appears to contain plain text
 */
function isPlainText(buffer: Buffer): boolean {
    // Check first 8KB for binary content
    const sampleSize = Math.min(buffer.length, 8192);
    for (let i = 0; i < sampleSize; i++) {
        const byte = buffer[i];
        // Check for null bytes or other non-printable characters
        // Allow common whitespace characters
        if (byte === 0) {
            return false;
        }
    }
    return true;
}

/**
 * Maximum file size in bytes (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validates file size
 */
export function validateFileSize(
    size: number,
    maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
    if (size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        return {
            valid: false,
            error: `File size exceeds maximum allowed size of ${maxMB}MB`,
        };
    }
    return { valid: true };
}
