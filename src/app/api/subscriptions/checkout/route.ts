import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSubscriptionPlan } from "@/services/subscription-service";
import { createCheckoutSession, createCustomer } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const userId = parseInt(session.user.id as string);
		const searchParams = request.nextUrl.searchParams;
		const planId = searchParams.get("planId");

		if (!planId) {
			return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
		}

		// Get the subscription plan
		const plan = await getSubscriptionPlan(parseInt(planId));

		if (!plan) {
			return NextResponse.json({ error: "Plan not found" }, { status: 404 });
		}

		if (!plan.is_active) {
			return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
		}

		// Get or create Stripe customer
		const user = await db.user.findUnique({
			where: { id: userId },
			include: { subscription: true },
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		let customerId = user.subscription?.stripe_customer_id;

		if (!customerId) {
			// Create new Stripe customer
			const customer = await createCustomer(
				user.username, // Using username as email placeholder - adjust based on your auth setup
				user.username
			);
			customerId = customer.id;

			// Update user with customer ID if they have a subscription record
			if (user.subscription) {
				await db.userSubscription.update({
					where: { user_id: userId },
					data: { stripe_customer_id: customerId },
				});
			}
		}

		// Determine which price ID to use (monthly or yearly)
		// For now, defaulting to monthly - you can add a query param for billing cycle
		const priceId = plan.stripe_price_id_monthly;

		if (!priceId) {
			return NextResponse.json(
				{ error: "Stripe price ID not configured for this plan" },
				{ status: 500 }
			);
		}

		// Create checkout session
		const checkoutSession = await createCheckoutSession(
			customerId,
			priceId,
			userId,
			`${request.nextUrl.origin}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
			`${request.nextUrl.origin}/pricing?canceled=true`
		);

		// Redirect to Stripe checkout
		return NextResponse.redirect(checkoutSession.url!);
	} catch (error) {
		console.error("[CHECKOUT] Error creating checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 }
		);
	}
}

