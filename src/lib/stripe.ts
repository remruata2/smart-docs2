import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
	apiVersion: "2025-02-24.acacia",
	typescript: true,
});

/**
 * Create a Stripe customer
 */
export async function createCustomer(
	email: string,
	name?: string,
	metadata?: Record<string, string>
) {
	return await stripe.customers.create({
		email,
		name,
		metadata,
	});
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
	customerId: string,
	priceId: string,
	userId: number,
	successUrl: string,
	cancelUrl: string
) {
	return await stripe.checkout.sessions.create({
		customer: customerId,
		payment_method_types: ["card"],
		line_items: [
			{
				price: priceId,
				quantity: 1,
			},
		],
		mode: "subscription",
		success_url: successUrl,
		cancel_url: cancelUrl,
		metadata: {
			userId: userId.toString(),
		},
	});
}

/**
 * Create a portal session for subscription management
 */
export async function createPortalSession(
	customerId: string,
	returnUrl: string
) {
	return await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: returnUrl,
	});
}

/**
 * Get subscription from Stripe
 */
export async function getSubscription(subscriptionId: string) {
	return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription in Stripe
 */
export async function cancelStripeSubscription(
	subscriptionId: string,
	immediately: boolean = false
) {
	if (immediately) {
		return await stripe.subscriptions.cancel(subscriptionId);
	} else {
		return await stripe.subscriptions.update(subscriptionId, {
			cancel_at_period_end: true,
		});
	}
}

/**
 * Update subscription in Stripe
 */
export async function updateSubscription(
	subscriptionId: string,
	newPriceId: string
) {
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);

	return await stripe.subscriptions.update(subscriptionId, {
		items: [
			{
				id: subscription.items.data[0].id,
				price: newPriceId,
			},
		],
		proration_behavior: "always_invoice",
	});
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
	payload: string | Buffer,
	signature: string,
	secret: string
): Stripe.Event {
	return stripe.webhooks.constructEvent(payload, signature, secret);
}
