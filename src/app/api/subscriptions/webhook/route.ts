import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { upsertUserSubscription, updateSubscriptionStatus } from "@/services/subscription-service";
import { getSubscriptionPlan } from "@/services/subscription-service";
import { SubscriptionStatus, BillingCycle } from "@/generated/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
	const body = await request.text();
	const signature = request.headers.get("stripe-signature");

	if (!signature) {
		return NextResponse.json({ error: "No signature" }, { status: 400 });
	}

	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
	}

	try {
		// Verify webhook signature
		const event = verifyWebhookSignature(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		) as Stripe.Event;

		// Handle different event types
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = parseInt(session.metadata?.userId || "0");
				const subscriptionId = session.subscription as string;

				if (!userId || !subscriptionId) {
					console.error("[WEBHOOK] Missing userId or subscriptionId");
					break;
				}

				// Get subscription details from Stripe
				const stripe = require("@/lib/stripe").stripe;
				const subscription = await stripe.subscriptions.retrieve(subscriptionId);
				const plan = await getSubscriptionPlan(
					parseInt(session.metadata?.planId || "0")
				);

				if (!plan) {
					console.error("[WEBHOOK] Plan not found");
					break;
				}

				// Determine billing cycle
				const billingCycle =
					subscription.items.data[0].price.recurring?.interval === "year"
						? BillingCycle.yearly
						: BillingCycle.monthly;

				// Create or update subscription
				await upsertUserSubscription(userId, {
					planId: plan.id,
					stripeSubscriptionId: subscriptionId,
					stripeCustomerId: subscription.customer as string,
					status: SubscriptionStatus.active,
					billingCycle,
					currentPeriodStart: new Date(subscription.current_period_start * 1000),
					currentPeriodEnd: new Date(subscription.current_period_end * 1000),
				});

				console.log(`[WEBHOOK] Subscription created for user ${userId}`);
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				const userId = parseInt(subscription.metadata?.userId || "0");

				if (!userId) {
					// Try to find user by customer ID
					const userSubscription = await require("@/lib/db").db.userSubscription.findUnique({
						where: { stripe_subscription_id: subscription.id },
					});

					if (!userSubscription) {
						console.error("[WEBHOOK] User subscription not found");
						break;
					}

					// Update subscription status
					let status: SubscriptionStatus = SubscriptionStatus.active;
					if (subscription.status === "canceled") {
						status = SubscriptionStatus.canceled;
					} else if (subscription.status === "past_due") {
						status = SubscriptionStatus.past_due;
					} else if (subscription.status === "trialing") {
						status = SubscriptionStatus.trialing;
					}

					await updateSubscriptionStatus(userSubscription.user_id, status);

					// Update period dates
					await require("@/lib/db").db.userSubscription.update({
						where: { user_id: userSubscription.user_id },
						data: {
							current_period_start: new Date(subscription.current_period_start * 1000),
							current_period_end: new Date(subscription.current_period_end * 1000),
							cancel_at_period_end: subscription.cancel_at_period_end || false,
						},
					});

					console.log(`[WEBHOOK] Subscription updated for user ${userSubscription.user_id}`);
				}
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				const userSubscription = await require("@/lib/db").db.userSubscription.findUnique({
					where: { stripe_subscription_id: subscription.id },
				});

				if (userSubscription) {
					await updateSubscriptionStatus(userSubscription.user_id, SubscriptionStatus.canceled);
					console.log(`[WEBHOOK] Subscription canceled for user ${userSubscription.user_id}`);
				}
				break;
			}

			default:
				console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("[WEBHOOK] Error processing webhook:", error);
		return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
	}
}

