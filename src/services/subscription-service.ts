import { db } from "@/lib/db";
import {
	SubscriptionStatus,
	BillingCycle,
	UsageType,
} from "@/generated/prisma";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

/**
 * Get subscription plan by ID
 */
export async function getSubscriptionPlan(planId: number) {
	return await db.subscriptionPlan.findUnique({
		where: { id: planId },
	});
}

/**
 * Get all active subscription plans
 */
export async function getActivePlans() {
	return await db.subscriptionPlan.findMany({
		where: { is_active: true },
		orderBy: { price_monthly: "asc" },
	});
}

/**
 * Get default subscription plan (free tier)
 */
export async function getDefaultPlan() {
	return await db.subscriptionPlan.findFirst({
		where: { is_default: true, is_active: true },
	});
}

/**
 * Get user's current subscription
 */
export async function getUserSubscription(userId: number) {
	return await db.userSubscription.findUnique({
		where: { user_id: userId },
		include: {
			plan: true,
		},
	});
}

/**
 * Create or update user subscription
 */
export async function upsertUserSubscription(
	userId: number,
	data: {
		planId: number;
		stripeSubscriptionId?: string;
		stripeCustomerId?: string;
		status?: SubscriptionStatus;
		billingCycle?: BillingCycle;
		currentPeriodStart: Date;
		currentPeriodEnd: Date;
	}
) {
	const {
		planId,
		stripeSubscriptionId,
		stripeCustomerId,
		status = SubscriptionStatus.active,
		billingCycle = BillingCycle.monthly,
		currentPeriodStart,
		currentPeriodEnd,
	} = data;

	return await db.userSubscription.upsert({
		where: { user_id: userId },
		update: {
			plan_id: planId,
			stripe_subscription_id: stripeSubscriptionId,
			stripe_customer_id: stripeCustomerId,
			status,
			billing_cycle: billingCycle,
			current_period_start: currentPeriodStart,
			current_period_end: currentPeriodEnd,
		},
		create: {
			user_id: userId,
			plan_id: planId,
			stripe_subscription_id: stripeSubscriptionId,
			stripe_customer_id: stripeCustomerId,
			status,
			billing_cycle: billingCycle,
			current_period_start: currentPeriodStart,
			current_period_end: currentPeriodEnd,
		},
		include: {
			plan: true,
		},
	});
}

/**
 * Cancel user subscription
 */
export async function cancelSubscription(
	userId: number,
	cancelAtPeriodEnd: boolean = true
) {
	return await db.userSubscription.update({
		where: { user_id: userId },
		data: {
			cancel_at_period_end: cancelAtPeriodEnd,
			canceled_at: cancelAtPeriodEnd ? null : new Date(),
			status: cancelAtPeriodEnd
				? SubscriptionStatus.active
				: SubscriptionStatus.canceled,
		},
		include: {
			plan: true,
		},
	});
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
	userId: number,
	status: SubscriptionStatus
) {
	return await db.userSubscription.update({
		where: { user_id: userId },
		data: { status },
		include: {
			plan: true,
		},
	});
}

/**
 * Get user's subscription limits
 */
export async function getUserLimits(userId: number) {
	const subscription = await getUserSubscription(userId);

	if (!subscription) {
		// Return default plan limits if no subscription
		const defaultPlan = await getDefaultPlan();
		if (!defaultPlan) {
			throw new Error("No default plan found");
		}
		return defaultPlan.limits as {
			files: number;
			chats: number;
			exports: number;
		};
	}

	return subscription.plan.limits as {
		files: number;
		chats: number;
		exports: number;
	};
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: number): Promise<boolean> {
	const subscription = await getUserSubscription(userId);

	if (!subscription) {
		return false;
	}

	return (
		subscription.status === SubscriptionStatus.active ||
		subscription.status === SubscriptionStatus.trialing
	);
}

/**
 * Get subscription features
 */
export async function getUserFeatures(userId: number) {
	const subscription = await getUserSubscription(userId);

	if (!subscription) {
		const defaultPlan = await getDefaultPlan();
		if (!defaultPlan) {
			return [];
		}
		return (defaultPlan.features as string[]) || [];
	}

	return (subscription.plan.features as string[]) || [];
}

