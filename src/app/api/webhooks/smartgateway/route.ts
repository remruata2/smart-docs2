import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { upsertUserSubscription } from "@/services/subscription-service";
import { SubscriptionStatus, BillingCycle } from "@/generated/prisma";

/**
 * Verify Basic HTTP Authentication from SmartGateway webhook.
 * SmartGateway sends: Authorization: Basic base64(username:password)
 */
function verifyBasicAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
        console.error("[WEBHOOK-SG] MISSING Authorization header");
        return false;
    }

    if (!authHeader.startsWith("Basic ")) {
        console.error(`[WEBHOOK-SG] INVALID Auth header format: ${authHeader.slice(0, 10)}...`);
        return false;
    }

    const expectedUsername = process.env.SMARTGATEWAY_WEBHOOK_USERNAME || "";
    const expectedPassword = process.env.SMARTGATEWAY_WEBHOOK_SECRET || "";

    try {
        const base64Creds = authHeader.slice(6); // Remove "Basic "
        const decoded = Buffer.from(base64Creds, "base64").toString("utf-8");
        const [username, password] = decoded.split(":");
        
        const success = username === expectedUsername && password === expectedPassword;
        if (!success) {
            console.error(`[WEBHOOK-SG] Credentials mismatch. Received: ${username}:${"*".repeat(password?.length || 0)}, Expected: ${expectedUsername}:****`);
        }
        return success;
    } catch (e) {
        console.error("[WEBHOOK-SG] Error decoding Basic Auth:", e);
        return false;
    }
}

export async function POST(request: NextRequest) {
    console.log(`[WEBHOOK-SG] RECEIVED REQUEST - ${new Date().toISOString()}`);
    const bodyText = await request.text();

    // Verify Basic Auth credentials
    const isAuthorized = verifyBasicAuth(request);
    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const event = JSON.parse(bodyText);
        console.log(`[WEBHOOK-SG] Received event: ${event.event_name}, Order ID: ${event.content?.order?.order_id || "N/A"}`);

        switch (event.event_name) {
            case "ORDER_SUCCEEDED":
            case "TRANSACTION_CHARGED": {
                // Determine if it was a Course Enrollment or a Subscription
                // We appended prefixes when creating order_id: CRSE_ vs SUB_
                const orderId = event.content.order.order_id as string;
                
                if (orderId.startsWith("CRSE_")) {
                    await handleCourseEnrollment(orderId, event.content);
                } else if (orderId.startsWith("SUB_")) {
                    await handleSubscriptionPayment(orderId, event.content);
                } else {
                    console.log(`[WEBHOOK-SG] Unrecognized order prefix: ${orderId}`);
                }
                break;
            }
            case "SUBSCRIPTION_CANCELLED": // Depending on SmartGateway mandate APIs
                // Handle cancellation logic here
                break;
            default:
                console.log(`[WEBHOOK-SG] Unhandled event type: ${event.event_name}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[WEBHOOK-SG] Error processing webhook:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: "SmartGateway Webhook Endpoint Active" });
}

async function handleCourseEnrollment(orderId: string, content: any) {
    console.log(`[WEBHOOK-SG] Processing Course payment for order: ${orderId}`);
    
    // Extract pieces: CRSE_{courseId}_{userId}_{random}
    const parts = orderId.split("_");
    if (parts.length < 4) return;
    
    const courseId = parseInt(parts[1], 10);
    const userId = parseInt(parts[2], 10);

    // Enroll the user using the existing action (bypassing normal session check by passing user directly inside if needed)
    // Actually, `enrollInCourse` might rely on `getServerSession`.
    // We should directly create the enrollment in DB since this is a server-to-server webhook.
    
    // Check if already enrolled
    const existingEnrollment = await db.userEnrollment.findUnique({
        where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    });

    if (!existingEnrollment) {
        await db.userEnrollment.create({
            data: {
                user_id: userId,
                course_id: courseId,
                status: "active",
                is_paid: true,
                payment_id: orderId, // Store the SmartGateway Order ID
            },
        });
        console.log(`[WEBHOOK-SG] Successfully enrolled user ${userId} in course ${courseId}`);
    } else {
        console.log(`[WEBHOOK-SG] User ${userId} already enrolled in course ${courseId}`);
    }
}

async function handleSubscriptionPayment(orderId: string, content: any) {
    console.log(`[WEBHOOK-SG] Processing Subscription payment for order: ${orderId}`);
    
    // We stored the orderId temporarily in `razorpay_order_id` field in previous step.
    const userSubscription = await db.userSubscription.findFirst({
        where: { razorpay_order_id: orderId },
    });

    if (!userSubscription) {
        console.error(`[WEBHOOK-SG] User subscription not found for order ${orderId}`);
        return;
    }

    // Extract mandate information from the SmartGateway response
    // It can be at content.order.mandate_id or content.mandate.id
    const mandateId = content.order?.mandate_id || content.mandate?.id || orderId; 
    const mandateStatus = content.mandate?.status || "active";
    // For recurring payments (subsequent charges), we advance the dates
    let nextPeriodStart = userSubscription.current_period_start;
    let nextPeriodEnd = userSubscription.current_period_end;

    // If this is a subsequent payment (current period end is in the past or close), advance it
    const now = new Date();
    if (userSubscription.current_period_end < now || 
        (userSubscription.current_period_end.getTime() - now.getTime()) < (7 * 24 * 60 * 60 * 1000)) {
        nextPeriodStart = new Date();
        nextPeriodEnd = new Date(nextPeriodStart);
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + (userSubscription.billing_cycle === "yearly" ? 12 : 1));
    }

    await upsertUserSubscription(userSubscription.user_id, {
        planId: userSubscription.plan_id,
        razorpaySubscriptionId: mandateId, 
        razorpayCustomerId: content.order?.customer_id || userSubscription.razorpay_customer_id || null,
        status: SubscriptionStatus.active,
        billingCycle: userSubscription.billing_cycle || BillingCycle.monthly,
        currentPeriodStart: nextPeriodStart,
        currentPeriodEnd: nextPeriodEnd,
    });

    console.log(`[WEBHOOK-SG] Subscription activated for user ${userSubscription.user_id}`);
}
