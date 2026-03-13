import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSmartGateway } from "@/lib/smartgateway";
import { upsertUserSubscription } from "@/services/subscription-service";
import { SubscriptionStatus, BillingCycle } from "@/generated/prisma";

/**
 * SmartGateway Return Bridge
 * 
 * SmartGateway POSTs data back to the return_url after payment.
 * This cross-origin POST strips session cookies in Next.js, causing the user
 * to appear logged out and get redirected to /login.
 * 
 * This bridge:
 * 1. Extracts the order_id from URL params or POST body
 * 2. Calls SmartGateway Order Status API to verify payment (server-to-server)
 * 3. Enrolls user only if status is CHARGED
 * 4. Redirects to destination with a 303 See Other (preserving session)
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
    try {
        if (bodyText) {
            const params = new URLSearchParams(bodyText);
            const destination = params.get("destination") || "";
            const courseId = params.get("courseId");
            const payment = params.get("payment") || "success";
            
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

            // Derive destination from order_id
            const orderId = params.get("order_id") || params.get("orderId") || "";
            if (orderId.startsWith("CRSE_")) {
                const parts = orderId.split("_");
                if (parts.length >= 2) {
                    return {
                        destination: `/courses/${parts[1]}`,
                        courseId: parts[1],
                        payment: "success",
                    };
                }
            } else if (orderId.startsWith("SUB_")) {
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

/**
 * Extract the order_id from URL params or POST body
 */
function extractOrderId(request: NextRequest, bodyText: string): string | null {
    // 1. Check URL param
    let urlOrderId = request.nextUrl.searchParams.get("order_id") || request.nextUrl.searchParams.get("orderId");
    // Defensive: SmartGateway may duplicate the order_id param, resulting in "ID,ID"
    if (urlOrderId && urlOrderId.includes(",")) {
        urlOrderId = urlOrderId.split(",")[0];
    }
    if (urlOrderId) return urlOrderId;

    // 2. Derive from destination path (e.g., /courses/13 + courseId param)
    // This won't give us the full order_id, so check body
    if (bodyText) {
        try {
            const params = new URLSearchParams(bodyText);
            let fromBody = params.get("order_id") || params.get("orderId");
            if (fromBody && fromBody.includes(",")) {
                fromBody = fromBody.split(",")[0];
            }
            if (fromBody) return fromBody;
        } catch { /* ignore */ }
    }

    return null;
}

async function updatePaymentTransaction(orderId: string, status: string, gatewayResponse: any) {
    try {
        await db.paymentTransaction.update({
            where: { order_id: orderId },
            data: {
                status: status,
                gateway_status: gatewayResponse?.status || null,
                gateway_transaction_id: gatewayResponse?.txn_id || null,
                payment_method: gatewayResponse?.payment_method || null,
                error_message: gatewayResponse?.resp_message || null,
                updated_at: new Date(),
            }
        });
    } catch (e) {
        console.error(`[RETURN-BRIDGE] Error updating transaction ${orderId}:`, e);
    }
}

/**
 * Verify order status with SmartGateway and enroll user if CHARGED
 */
async function verifyAndEnroll(orderId: string): Promise<boolean> {
    try {
        const smartgateway = getSmartGateway();
        const orderStatus = await (smartgateway as any).order.status(orderId, {});
        
        const status = orderStatus?.status?.toUpperCase();
        console.log(`[RETURN-BRIDGE] Order ${orderId} status: ${status}`);

        // Update our transaction record with the latest status from gateway
        await updatePaymentTransaction(orderId, status === "CHARGED" ? "CHARGED" : (status === "FAILED" ? "FAILED" : "PENDING"), orderStatus);

        if (status !== "CHARGED") {
            console.log(`[RETURN-BRIDGE] Order ${orderId} not CHARGED (${status}), skipping enrollment`);
            return false;
        }

        // Parse order_id prefix to determine type
        if (orderId.startsWith("CRSE_")) {
            return await handleCourseEnrollment(orderId);
        } else if (orderId.startsWith("SUB_")) {
            return await handleSubscriptionActivation(orderId);
        }

        return false;
    } catch (error) {
        console.error(`[RETURN-BRIDGE] Error verifying order ${orderId}:`, error);
        return false;
    }
}

async function handleCourseEnrollment(orderId: string): Promise<boolean> {
    // CRSE_{courseId}_{userId}_{random}
    const parts = orderId.split("_");
    if (parts.length < 4) return false;

    const courseId = parseInt(parts[1], 10);
    const userId = parseInt(parts[2], 10);

    if (isNaN(courseId) || isNaN(userId)) return false;

    const existing = await db.userEnrollment.findUnique({
        where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });

    if (existing) {
        console.log(`[RETURN-BRIDGE] User ${userId} already enrolled in course ${courseId}`);
        return true; // Already enrolled (possibly by webhook)
    }

    await db.userEnrollment.create({
        data: {
            user_id: userId,
            course_id: courseId,
            status: "active",
            is_paid: true,
            payment_id: orderId,
        },
    });
    console.log(`[RETURN-BRIDGE] Enrolled user ${userId} in course ${courseId} (verified CHARGED)`);
    return true;
}

async function handleSubscriptionActivation(orderId: string): Promise<boolean> {
    const userSubscription = await db.userSubscription.findFirst({
        where: { razorpay_order_id: orderId },
    });

    if (!userSubscription) {
        console.error(`[RETURN-BRIDGE] Subscription not found for order ${orderId}`);
        return false;
    }

    if (userSubscription.status === "active") {
        console.log(`[RETURN-BRIDGE] Subscription for order ${orderId} already active`);
        return true;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (userSubscription.billing_cycle === "yearly" ? 12 : 1));

    await upsertUserSubscription(userSubscription.user_id, {
        planId: userSubscription.plan_id,
        razorpaySubscriptionId: orderId,
        razorpayCustomerId: userSubscription.razorpay_customer_id || null,
        status: SubscriptionStatus.active,
        billingCycle: userSubscription.billing_cycle as BillingCycle || BillingCycle.monthly,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
    });

    console.log(`[RETURN-BRIDGE] Subscription activated for user ${userSubscription.user_id} (verified CHARGED)`);
    return true;
}

async function handleReturn(request: NextRequest, bodyText: string = ""): Promise<NextResponse> {
    // 1. Try URL query params first
    let { destination, courseId, payment } = getDestinationFromUrl(request);

    // 2. If no destination in URL, try POST body
    if (!destination && bodyText) {
        const bodyParams = await getDestinationFromBody(request, bodyText);
        destination = bodyParams.destination;
        courseId = bodyParams.courseId;
        payment = bodyParams.payment;
    }

    // 3. Verify payment and enroll (server-to-server check)
    const orderId = extractOrderId(request, bodyText);
    let isSuccessfullyCharged = false;

    if (orderId) {
        isSuccessfullyCharged = await verifyAndEnroll(orderId);
        if (!isSuccessfullyCharged) {
            payment = "pending"; // Don't show success if not actually charged
        }
    }

    // 4. SECURITY: URL Redirection Validation (HDFC requirement)
    // Only allow redirects to internal app paths
    const allowedPrefixes = ["/courses/", "/app/", "/dashboard"];
    const isAllowedDestination = allowedPrefixes.some(prefix => destination.startsWith(prefix));
    
    if (!isAllowedDestination && destination !== "") {
        console.warn(`[RETURN-BRIDGE] Blocked potentially unsafe redirect to: ${destination}`);
        destination = "/app/dashboard";
    }

    // 5. Final fallback
    if (!destination) {
        destination = "/app/dashboard";
        console.log("[RETURN-BRIDGE] No destination found, falling back to /app/dashboard");
    }

    // 6. SUCCESS REDIRECT: Display data to end user in real-time (HDFC requirement)
    // If successful, redirect to the dedicated payment-success page instead of the course page
    if (isSuccessfullyCharged && orderId) {
        const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
        // For courses, we want the specific course success page
        if (orderId.startsWith("CRSE_")) {
            const parts = orderId.split("_");
            const cid = courseId || parts[1];
            const successUrl = new URL(`/courses/${cid}/payment-success`, baseUrl);
            successUrl.searchParams.set("order_id", orderId);
            console.log(`[RETURN-BRIDGE] Redirecting to success page: ${successUrl.toString()}`);
            return NextResponse.redirect(successUrl, { status: 303 });
        } 
        // For subscriptions, we can redirect to a general subscription success page or dashboard
        // Let's create a general success route or reusable component later.
        // For now, let's keep it consistent.
    }

    // Build default redirect URL (for pending/fail or generic)
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUrl = new URL(destination, baseUrl);
    redirectUrl.searchParams.set("payment", payment);
    if (courseId) {
        redirectUrl.searchParams.set("courseId", courseId);
    }
    if (orderId) {
        redirectUrl.searchParams.set("order_id", orderId);
    }

    console.log(`[RETURN-BRIDGE] Redirecting to: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
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
