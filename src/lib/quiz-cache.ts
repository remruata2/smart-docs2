/**
 * Simple in-memory cache for quiz generation
 * Uses TTL-based expiration to prevent stale data
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class QuizCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number = 60 * 60 * 1000; // 1 hour in milliseconds

    /**
     * Get value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set value in cache with optional TTL
     */
    set<T>(key: string, value: T, ttlMs?: number): void {
        const ttl = ttlMs ?? this.defaultTTL;
        const expiresAt = Date.now() + ttl;

        this.cache.set(key, {
            value,
            expiresAt
        });
    }

    /**
     * Delete value from cache
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Remove expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache stats
     */
    stats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
export const quizCache = new QuizCache();

// Periodic cleanup (every 10 minutes)
if (typeof window === 'undefined') { // Server-side only
    setInterval(() => {
        quizCache.cleanup();
    }, 10 * 60 * 1000);
}

/**
 * Helper to generate cache keys
 */
export const CacheKeys = {
    chapterContext: (chapterId: number | bigint) => `chapter:${chapterId}:context`,
    subjectContext: (subjectId: number) => `subject:${subjectId}:context`,
} as const;
