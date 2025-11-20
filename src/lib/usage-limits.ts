import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getCurrentUsage } from "@/lib/usage-tracking";
import { getUserLimits } from "@/services/subscription-service";
import { UsageType } from "@/generated/prisma";

export interface UsageLimitResult {
	allowed: boolean;
	reason?: string;
	currentUsage?: number;
	limit?: number;
}

/**
 * Check if user can perform an action based on their subscription limits
 */
export async function checkUsageLimit(
	usageType: UsageType,
	userId?: number
): Promise<UsageLimitResult> {
	try {
		// Skip usage limits in development mode or if DISABLE_USAGE_LIMITS is set
		if (
			process.env.NODE_ENV === "development" ||
			process.env.DISABLE_USAGE_LIMITS === "true"
		) {
			console.log(
				"[USAGE-LIMITS] Usage limits disabled (development mode or DISABLE_USAGE_LIMITS=true)"
			);
			return {
				allowed: true,
				currentUsage: 0,
				limit: -1, // Unlimited
			};
		}

		// Get session if userId not provided
		if (!userId) {
			const session = await getServerSession(authOptions);
			if (!session?.user?.id) {
				return {
					allowed: false,
					reason: "Authentication required",
				};
			}
			userId = parseInt(session.user.id as string);
		}

		// Get user's limits
		const limits = await getUserLimits(userId);
		const limit =
			limits[
				usageType === "file_upload"
					? "files"
					: usageType === "chat_message"
					? "chats"
					: "exports"
			];

		// Unlimited plans
		if (limit === -1) {
			return {
				allowed: true,
				currentUsage: 0,
				limit: -1,
			};
		}

		// Check current usage
		const currentUsage = await getCurrentUsage(userId, usageType);
		const allowed = currentUsage < limit;

		return {
			allowed,
			currentUsage,
			limit,
			reason: allowed
				? undefined
				: `You have reached your ${usageType.replace(
						"_",
						" "
				  )} limit of ${limit}. Please upgrade your plan.`,
		};
	} catch (error) {
		console.error("[USAGE-LIMITS] Error checking usage limit:", error);
		return {
			allowed: false,
			reason: "Error checking usage limits",
		};
	}
}

/**
 * Middleware helper to enforce usage limits in API routes
 */
export async function enforceUsageLimit(
	usageType: UsageType,
	userId?: number
): Promise<
	{ success: true } | { success: false; error: string; status: number }
> {
	// Skip usage limits in development mode or if DISABLE_USAGE_LIMITS is set
	if (
		process.env.NODE_ENV === "development" ||
		process.env.DISABLE_USAGE_LIMITS === "true"
	) {
		console.log(
			"[USAGE-LIMITS] Usage limits disabled (development mode or DISABLE_USAGE_LIMITS=true)"
		);
		return { success: true };
	}

	const result = await checkUsageLimit(usageType, userId);

	if (!result.allowed) {
		return {
			success: false,
			error: result.reason || "Usage limit exceeded",
			status: 429, // Too Many Requests
		};
	}

	return { success: true };
}
