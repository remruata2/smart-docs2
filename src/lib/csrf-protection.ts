/**
 * CSRF Protection utilities
 * Validates that requests originate from allowed origins
 */

import { NextRequest } from "next/server";

// Get allowed origins from environment or use defaults
function getAllowedOrigins(): (string | RegExp)[] {
    const origins: (string | RegExp)[] = [];

    // Add NEXTAUTH_URL if set
    if (process.env.NEXTAUTH_URL) {
        origins.push(process.env.NEXTAUTH_URL);
        // Automatically add www variant or non-www variant
        const url = new URL(process.env.NEXTAUTH_URL);
        if (url.hostname.startsWith("www.")) {
            // Add non-www version
            url.hostname = url.hostname.replace("www.", "");
            origins.push(url.origin);
        } else {
            // Add www version
            url.hostname = "www." + url.hostname;
            origins.push(url.origin);
        }
    }

    // Add custom allowed origins
    if (process.env.ALLOWED_ORIGINS) {
        origins.push(...process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()));
    }

    // In development, allow localhost and common local network IP patterns
    if (process.env.NODE_ENV !== "production") {
        origins.push("http://localhost:3000", "http://127.0.0.1:3000");
        origins.push("http://localhost:3003", "http://127.0.0.1:3003");
        
        // Match common local network IP ranges (192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x)
        // This is safe because it only applies when NODE_ENV is not production
        origins.push(/http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):3003/ as any);
    }

    return origins;
}

export interface CsrfValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates CSRF by checking Origin header
 * Should be called at the beginning of state-changing API routes (POST, PUT, DELETE, PATCH)
 */
export function validateCsrf(request: NextRequest): CsrfValidationResult {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // For same-origin requests, origin might be null (e.g., direct navigation)
    // But for API calls from JavaScript, Origin should be present
    if (!origin && !referer) {
        // Allow requests without Origin/Referer in development
        // In production, this could be a direct API call (curl, etc.)
        if (process.env.NODE_ENV === "production") {
            return {
                valid: false,
                error: "Missing Origin header",
            };
        }
        return { valid: true };
    }

    const allowedOrigins = getAllowedOrigins();

    // Check Origin header
    if (origin) {
        const isAllowed = allowedOrigins.some((allowed) => {
            if (allowed instanceof RegExp) {
                return (allowed as RegExp).test(origin);
            }
            return origin.startsWith(allowed as string);
        });

        if (isAllowed) {
            return { valid: true };
        }
        return {
            valid: false,
            error: `Origin not allowed: ${origin}`,
        };
    }

    // Fall back to Referer check
    if (referer) {
        const isAllowed = allowedOrigins.some((allowed) => {
            if (allowed instanceof RegExp) {
                return (allowed as RegExp).test(referer);
            }
            return referer.startsWith(allowed as string);
        });

        if (isAllowed) {
            return { valid: true };
        }
        return {
            valid: false,
            error: `Referer not allowed: ${referer}`,
        };
    }

    return { valid: true };
}

/**
 * Higher-order function to wrap API handlers with CSRF protection
 * Usage: export const POST = withCsrfProtection(handler);
 */
export function withCsrfProtection<T>(
    handler: (request: NextRequest) => Promise<T>
): (request: NextRequest) => Promise<T | Response> {
    return async (request: NextRequest) => {
        // Only check CSRF for state-changing methods
        const method = request.method.toUpperCase();
        if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
            const csrfResult = validateCsrf(request);
            if (!csrfResult.valid) {
                console.warn(
                    `[CSRF] Blocked request: ${csrfResult.error}, URL: ${request.url}`
                );
                return new Response(
                    JSON.stringify({ error: "CSRF validation failed" }),
                    {
                        status: 403,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        }
        return handler(request);
    };
}
