/**
 * Rate Limiter Implementation
 * 
 * Protects API endpoints from abuse by limiting requests per time window
 */

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private cache: Map<string, RateLimitInfo>;
  private options: {
    windowMs: number;
    max: number;
  };

  constructor(options: { windowMs: number; max: number }) {
    this.cache = new Map();
    this.options = options;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, info] of this.cache.entries()) {
      if (now > info.resetAt) {
        this.cache.delete(key);
      }
    }
  }

  async check(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number;
    resetAt: Date;
  }> {
    const now = Date.now();
    let info = this.cache.get(key);

    // Reset if window expired
    if (!info || now > info.resetAt) {
      info = {
        count: 0,
        resetAt: now + this.options.windowMs,
      };
    }

    info.count++;
    this.cache.set(key, info);

    const allowed = info.count <= this.options.max;
    const remaining = Math.max(0, this.options.max - info.count);
    const resetIn = info.resetAt - now;

    return {
      allowed,
      remaining,
      resetIn,
      resetAt: new Date(info.resetAt),
    };
  }

  reset(key: string) {
    this.cache.delete(key);
  }
}

// Pre-configured rate limiters for different endpoints
export const chatRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per user
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 30, // 30 requests per minute for general API
});


