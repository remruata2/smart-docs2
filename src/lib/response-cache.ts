/**
 * AI Response Cache Service
 * 
 * Implements semantic caching for chat responses to reduce API calls.
 * Uses analyzer output (coreSearchTerms, queryType) to generate cache keys
 * that match semantically similar questions.
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Cache TTL in hours (72 hours / 3 days default)
const CACHE_TTL_HOURS = 72;

interface CacheKeyParams {
    coreSearchTerms: string;
    queryType: string;
    chapterId?: string | number | bigint;
    subjectId?: string | number | bigint;
}

interface CachedResponse {
    text: string;
    images?: string[];
    inputTokens: number;
    outputTokens: number;
}

/**
 * Generate a semantic cache key from query analysis results
 */
export function generateCacheKey(params: CacheKeyParams): string {
    // Common stop words to remove for better semantic matching
    const stopWords = new Set([
        "what", "is", "are", "explain", "describe", "tell", "me", "about",
        "how", "define", "the", "a", "an", "do", "does", "can", "you",
        "please", "give", "list", "why"
    ]);

    // Normalize search terms: lowercase, remove stop words, sort words, remove extra spaces
    const normalizedTerms = params.coreSearchTerms
        .toLowerCase()
        .split(/[\s,?.!]+/) // Split by whitespace and punctuation
        .filter(word => word.length > 0 && !stopWords.has(word))
        .sort()
        .join("_");

    // Normalize queryType: treat search, explanation, and follow_up (with terms) as the same intent
    let normalizedType = params.queryType;
    if (["specific_search", "follow_up", "explanation", "simple_question", "elaboration"].includes(params.queryType)) {
        normalizedType = "content_query";
    }

    // Build key components
    const components = [
        normalizedType,
        normalizedTerms,
        params.chapterId?.toString() || "global",
        params.subjectId?.toString() || "any",
    ];

    // Create a hash for consistent key length
    const rawKey = components.join("::");
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex").slice(0, 32);

    return `chat:${hash}`;
}

/**
 * Get cached response if available and not expired
 */
export async function getCachedResponse(
    cacheKey: string
): Promise<CachedResponse | null> {
    try {
        // Check if cache entry exists and is valid
        const cacheEntry = await prisma.aiResponseCache.findUnique({
            where: { cache_key: cacheKey },
        });

        if (!cacheEntry) return null;

        // Check if expired
        if (new Date() > cacheEntry.expires_at) {
            // Delete expired entry asynchronously
            prisma.aiResponseCache.delete({ where: { cache_key: cacheKey } }).catch(() => { });
            return null;
        }

        // Increment hit count (async, don't wait)
        prisma.aiResponseCache.update({
            where: { id: cacheEntry.id },
            data: { hit_count: { increment: 1 } },
        }).catch(() => { });

        console.log(`[CACHE] HIT for key ${cacheKey} (${cacheEntry.hit_count + 1} hits)`);

        // Return cached response
        return {
            text: cacheEntry.response_text,
            inputTokens: cacheEntry.input_tokens,
            outputTokens: cacheEntry.output_tokens,
            images: cacheEntry.images || []
        };
    } catch (error) {
        console.error("[CACHE] Error retrieving from cache:", error);
        return null;
    }
}

interface SetCacheParams {
    queryType: string;
    question: string;
    chapterId?: string | number;
    subjectId?: string | number;
    response: CachedResponse;
}

/**
 * Store a response in the cache
 */
export async function setCachedResponse(key: string, params: SetCacheParams): Promise<boolean> {
    try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

        await prisma.aiResponseCache.upsert({
            where: { cache_key: key },
            update: {
                response_text: params.response.text,
                input_tokens: params.response.inputTokens,
                output_tokens: params.response.outputTokens,
                images: params.response.images || [],
                hit_count: { increment: 1 },
                expires_at: expiresAt,
            },
            create: {
                cache_key: key,
                query_type: params.queryType,
                chapter_id: params.chapterId ? BigInt(params.chapterId) : null,
                subject_id: params.subjectId ? BigInt(params.subjectId) : null,
                question: params.question,
                response_text: params.response.text,
                input_tokens: params.response.inputTokens,
                output_tokens: params.response.outputTokens,
                images: params.response.images || [],
                expires_at: expiresAt,
            },
        });

        return true;
    } catch (error) {
        console.error("[CACHE] Error setting cache:", error);
        return false;
    }
}

/**
 * Update a cached response with generated images
 */
export async function updateCachedResponseImages(key: string, images: string[]): Promise<boolean> {
    try {
        await prisma.aiResponseCache.update({
            where: { cache_key: key },
            data: {
                images: images
            }
        });
        return true;
    } catch (error) {
        console.error("[CACHE] Error updating cache images:", error);
        return false;
    }
}

/**
 * Clean up expired cache entries (call periodically)
 */
export async function cleanupExpiredCache(): Promise<number> {
    try {
        const result = await prisma.aiResponseCache.deleteMany({
            where: {
                expires_at: { lt: new Date() },
            },
        });
        console.log(`[CACHE] Cleaned up ${result.count} expired entries`);
        return result.count;
    } catch (error) {
        console.error("[CACHE] Error cleaning up cache:", error);
        return 0;
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    avgHitsPerEntry: number;
}> {
    try {
        const entries = await prisma.aiResponseCache.aggregate({
            _count: { id: true },
            _sum: { hit_count: true },
            _avg: { hit_count: true },
        });

        return {
            totalEntries: entries._count.id,
            totalHits: entries._sum.hit_count || 0,
            avgHitsPerEntry: entries._avg.hit_count || 0,
        };
    } catch (error) {
        console.error("[CACHE] Error getting stats:", error);
        return { totalEntries: 0, totalHits: 0, avgHitsPerEntry: 0 };
    }
}

/**
 * Clear cache for a specific chapter
 */
export async function clearChapterCache(chapterId: bigint | number): Promise<number> {
    try {
        const result = await prisma.aiResponseCache.deleteMany({
            where: {
                chapter_id: BigInt(chapterId),
            },
        });
        console.log(`[CACHE] Cleared ${result.count} entries for chapter ${chapterId}`);
        return result.count;
    } catch (error) {
        console.error(`[CACHE] Error clearing chapter cache for ${chapterId}:`, error);
        return 0;
    }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<number> {
    try {
        const result = await prisma.aiResponseCache.deleteMany({});
        console.log(`[CACHE] Cleared ALL cache (${result.count} entries)`);
        return result.count;
    } catch (error) {
        console.error("[CACHE] Error clearing all cache:", error);
        return 0;
    }
}
