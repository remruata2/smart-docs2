import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { upsertUserSubscription, updateSubscriptionStatus, getSubscriptionPlan } from "@/services/subscription-service";
import { SubscriptionStatus, BillingCycle } from "@/generated/prisma";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
        return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    try {
        // Verify webhook signature
        const isValid = verifyWebhookSignature(
            body,
            signature,
            process.env.RAZORPAY_WEBHOOK_SECRET
        );

        if (!isValid) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(body);
        const { payload } = event;

        // Handle different event types
        switch (event.event) {
            case "subscription.charged": {
                const subscription = payload.subscription.entity;
                const payment = payload.payment.entity;

                // Find user by subscription ID or customer ID
                // Since we might not have the subscription ID saved yet (first payment),
                // we might need to rely on metadata or email match if passed.
                // However, Razorpay doesn't pass custom metadata in subscription entity easily.
                // Best approach: Client side sends subscription ID to backend after creation,
                // OR we rely on email match if available.

                // For now, let's assume we can find the user via customer ID or email
                // This part is tricky with Razorpay compared to Stripe metadata.
                // A robust way is to store the subscription ID when created in the checkout API,
                // but linked to a pending state.

                // Let's try to find by razorpay_subscription_id
                let userSubscription = await db.userSubscription.findUnique({
                    where: { razorpay_subscription_id: subscription.id },
                });

                // If not found, we might need to find by customer_id
                if (!userSubscription && subscription.customer_id) {
                    userSubscription = await db.userSubscription.findFirst({
                        where: { razorpay_customer_id: subscription.customer_id },
                    });
                }

                if (!userSubscription) {
                    console.error(`[WEBHOOK] User subscription not found for ${subscription.id}`);
                    // Potential fix: Find user by email from customer details if available
                    break;
                }

                // Update subscription
                await upsertUserSubscription(userSubscription.user_id, {
                    planId: userSubscription.plan_id, // Keep existing plan or update if plan change logic exists
                    razorpaySubscriptionId: subscription.id,
                    razorpayCustomerId: subscription.customer_id,
                    status: SubscriptionStatus.active,
                    billingCycle: BillingCycle.monthly, // Infer from plan interval
                    currentPeriodStart: new Date(subscription.current_start * 1000),
                    currentPeriodEnd: new Date(subscription.current_end * 1000),
                });

                console.log(`[WEBHOOK] Subscription charged for user ${userSubscription.user_id}`);
                break;
            }

            case "subscription.cancelled": {
                const subscription = payload.subscription.entity;

                const userSubscription = await db.userSubscription.findUnique({
                    where: { razorpay_subscription_id: subscription.id },
                });

                if (userSubscription) {
                    await updateSubscriptionStatus(userSubscription.user_id, SubscriptionStatus.canceled);
                    console.log(`[WEBHOOK] Subscription canceled for user ${userSubscription.user_id}`);
                }
                break;
            }

            case "subscription.paused": {
                const subscription = payload.subscription.entity;
                const userSubscription = await db.userSubscription.findUnique({
                    where: { razorpay_subscription_id: subscription.id },
                });

                if (userSubscription) {
                    // Map paused to past_due or similar, or add paused status
                    await updateSubscriptionStatus(userSubscription.user_id, SubscriptionStatus.past_due);
                    console.log(`[WEBHOOK] Subscription paused for user ${userSubscription.user_id}`);
                }
                break;
            }

            default:
                console.log(`[WEBHOOK] Unhandled event type: ${event.event}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[WEBHOOK] Error processing webhook:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
    }
}
