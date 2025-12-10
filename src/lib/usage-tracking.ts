import { db } from "@/lib/db";
import { UsageType, Prisma } from "@/generated/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Track usage for a user
 */
export async function trackUsage(
	userId: number,
	usageType: UsageType,
	count: number = 1,
	metadata?: Record<string, any>
) {
	const now = new Date();
	const periodStart = startOfMonth(now);
	const periodEnd = endOfMonth(now);

	// Check if usage record exists for this period
	const existing = await db.usageTracking.findFirst({
		where: {
			user_id: userId,
			usage_type: usageType,
			period_start: periodStart,
			period_end: periodEnd,
		},
	});

	if (existing) {
		// Update existing record
		return await db.usageTracking.update({
			where: { id: existing.id },
			data: {
				count: existing.count + count,
				metadata: metadata
					? { ...(existing.metadata as object), ...metadata }
					: existing.metadata === null
						? Prisma.JsonNull
						: existing.metadata,
			},
		});
	} else {
		// Create new record
		return await db.usageTracking.create({
			data: {
				user_id: userId,
				usage_type: usageType,
				count,
				period_start: periodStart,
				period_end: periodEnd,
				metadata: metadata || {},
			},
		});
	}
}

/**
 * Get current period usage for a user
 */
export async function getCurrentUsage(
	userId: number,
	usageType: UsageType
): Promise<number> {
	const now = new Date();
	const periodStart = startOfMonth(now);
	const periodEnd = endOfMonth(now);

	const usage = await db.usageTracking.findFirst({
		where: {
			user_id: userId,
			usage_type: usageType,
			period_start: periodStart,
			period_end: periodEnd,
		},
	});

	return usage?.count || 0;
}

/**
 * Get all current period usage for a user
 */
export async function getAllCurrentUsage(userId: number) {
	const now = new Date();
	const periodStart = startOfMonth(now);
	const periodEnd = endOfMonth(now);

	const usageRecords = await db.usageTracking.findMany({
		where: {
			user_id: userId,
			period_start: periodStart,
			period_end: periodEnd,
		},
	});

	const usage: Record<UsageType, number> = {
		file_upload: 0,
		chat_message: 0,
		document_export: 0,
		ai_processing: 0,
		quiz_generation: 0,
		battle_match: 0,
		ai_tutor_session: 0,
	};

	usageRecords.forEach((record) => {
		usage[record.usage_type] = record.count;
	});

	return usage;
}

/**
 * Check if user has exceeded limit for a usage type
 */
export async function hasExceededLimit(
	userId: number,
	usageType: UsageType,
	limit: number
): Promise<boolean> {
	const currentUsage = await getCurrentUsage(userId, usageType);
	return currentUsage >= limit;
}

/**
 * Check if user can perform an action (hasn't exceeded limit)
 */
export async function canPerformAction(
	userId: number,
	usageType: UsageType,
	limit: number
): Promise<boolean> {
	return !(await hasExceededLimit(userId, usageType, limit));
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: number) {
	const now = new Date();
	const periodStart = startOfMonth(now);
	const periodEnd = endOfMonth(now);

	const usageRecords = await db.usageTracking.findMany({
		where: {
			user_id: userId,
			period_start: {
				gte: periodStart,
				lte: periodEnd,
			},
		},
		orderBy: {
			created_at: "desc",
		},
	});

	return usageRecords;
}
