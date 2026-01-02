/**
 * Image Generation Limits
 * Handles daily usage limits for image generation in chat
 */

import { prisma } from '@/lib/prisma';
import { UsageType } from '@/generated/prisma';

// Daily limit for image generation
export const IMAGE_GENERATION_DAILY_LIMIT = 10;

/**
 * Check if user has remaining image generation quota for today
 */
export async function checkImageGenerationLimit(userId: number): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
}> {
    // Get start of today (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's image generations
    const todayUsage = await prisma.usageTracking.aggregate({
        where: {
            user_id: userId,
            usage_type: UsageType.image_generation,
            created_at: {
                gte: today,
                lt: tomorrow,
            },
        },
        _sum: {
            count: true,
        },
    });

    const usedToday = todayUsage._sum.count || 0;
    const remaining = Math.max(0, IMAGE_GENERATION_DAILY_LIMIT - usedToday);

    return {
        allowed: remaining > 0,
        remaining,
        limit: IMAGE_GENERATION_DAILY_LIMIT,
    };
}

/**
 * Track image generation usage
 */
export async function trackImageGeneration(userId: number): Promise<void> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    await prisma.usageTracking.create({
        data: {
            user_id: userId,
            usage_type: UsageType.image_generation,
            count: 1,
            period_start: startOfDay,
            period_end: endOfDay,
            metadata: {
                generated_at: now.toISOString(),
            },
        },
    });
}
