import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * SmartGateway Return Bridge
 * 
 * SmartGateway POSTs data back to the return_url after payment.
 * This cross-origin POST strips session cookies in Next.js, causing the user
 * to appear logged out and get redirected to /login.
 * 
 * This bridge receives the POST, extracts query params, and does a 303 redirect
 * to the actual destination page — preserving the user's session.
 * 
 * IMPORTANT: SmartGateway may strip query params from the return_url when POSTing back.
 * We handle this by:
 * 1. First checking URL query params (ideal case)
 * 2. Then checking the POST body for return_url or custom fields
 * 3. Falling back to dashboard as last resort
 */

function getDestinationFromUrl(request: NextRequest): { destination: string; courseId: string | null; payment: string } {
    const { searchParams } = request.nextUrl;
    return {
        destination: searchParams.get("destination") || "",
        courseId: searchParams.get("courseId"),
        payment: searchParams.get("payment") || "success",
    };
}

async function getDestinationFromBody(request: NextRequest, bodyText: string): Promise<{ destination: string; courseId: string | null; payment: string }> {
    // SmartGateway typically sends form-urlencoded data in the POST body
    // It might also include the original return_url or parameters as fields
    try {
        if (bodyText) {
            // Parse as URL-encoded form data
            const params = new URLSearchParams(bodyText);

            // Check if the body contains our custom parameters
            const destination = params.get("destination") || "";
            const courseId = params.get("courseId");
            const payment = params.get("payment") || "success";
            
            // Also check if there's a return_url field that contains our params
            const returnUrl = params.get("return_url");
            if (returnUrl && !destination) {
                try {
                    const returnUrlObj = new URL(returnUrl);
                    return {
                        destination: returnUrlObj.searchParams.get("destination") || "",
                        courseId: returnUrlObj.searchParams.get("courseId"),
                        payment: returnUrlObj.searchParams.get("payment") || "success",
                    };
                } catch {
                    // Not a valid URL, ignore
                }
            }

            if (destination) {
                return { destination, courseId, payment };
            }

            // Try to derive destination from order_id (e.g., CRSE_14_123_456789 → /courses/14)
            const orderId = params.get("order_id") || params.get("orderId") || "";
            if (orderId.startsWith("CRSE_")) {
                const parts = orderId.split("_");
                if (parts.length >= 2) {
                    const derivedCourseId = parts[1];
                    console.log(`[RETURN-BRIDGE] Derived destination from order_id: /courses/${derivedCourseId}`);
                    return {
                        destination: `/courses/${derivedCourseId}`,
                        courseId: derivedCourseId,
                        payment: "success",
                    };
                }
            } else if (orderId.startsWith("SUB_")) {
                console.log(`[RETURN-BRIDGE] Subscription order detected, redirecting to dashboard`);
                return {
                    destination: "/app/dashboard",
                    courseId: null,
                    payment: "success",
                };
            }
        }
    } catch (e) {
        console.error("[RETURN-BRIDGE] Error parsing POST body:", e);
    }
    
    return { destination: "", courseId: null, payment: "success" };
}

async function handleReturn(request: NextRequest, bodyText: string = ""): Promise<NextResponse> {
    // 1. First try URL query params (works if SmartGateway preserves them)
    let { destination, courseId, payment } = getDestinationFromUrl(request);

    // 2. If destination not found in URL, try parsing from POST body
    if (!destination && bodyText) {
        const bodyParams = await getDestinationFromBody(request, bodyText);
        destination = bodyParams.destination;
        courseId = bodyParams.courseId;
        payment = bodyParams.payment;
    }

    // 3. Final fallback
    if (!destination) {
        destination = "/app/dashboard";
        console.log("[RETURN-BRIDGE] No destination found, falling back to /app/dashboard");
    }

    // Build the redirect URL
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUrl = new URL(destination, baseUrl);
    redirectUrl.searchParams.set("payment", payment);
    if (courseId) {
        redirectUrl.searchParams.set("courseId", courseId);
    }

    console.log(`[RETURN-BRIDGE] Redirecting to: ${redirectUrl.toString()}`);

    // 303 See Other forces the browser to do a GET request
    return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
    // Read the POST body from SmartGateway 
    let bodyText = "";
    try {
        bodyText = await request.text();
    } catch {
        // Ignore
    }
    return handleReturn(request, bodyText);
}

export async function GET(request: NextRequest) {
    return handleReturn(request);
}
