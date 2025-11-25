import { prisma } from "@/lib/prisma";

export async function calculateStreak(userId: number): Promise<number> {
    const userPoints = await prisma.userPoints.findMany({
        where: { user_id: userId },
        select: { created_at: true },
        orderBy: { created_at: 'desc' }
    });

    if (userPoints.length === 0) return 0;

    // Get all unique dates with activity
    const activityDates = Array.from(new Set(
        userPoints.map(p => new Date(p.created_at).toISOString().split('T')[0])
    )).sort().reverse(); // Newest first

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if active today or yesterday to keep streak alive
    if (!activityDates.includes(today) && !activityDates.includes(yesterday)) {
        return 0;
    }

    let currentStreak = 1;

    // Iterate and check if dates are consecutive
    for (let i = 0; i < activityDates.length - 1; i++) {
        const current = new Date(activityDates[i]);
        const next = new Date(activityDates[i + 1]);

        const diffTime = Math.abs(current.getTime() - next.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            currentStreak++;
        } else {
            break;
        }
    }

    return currentStreak;
}

export async function checkAndAwardBadges(userId: number, currentStreak: number) {
    // Find all active badges that match the current streak
    // We award badges for streaks <= currentStreak that haven't been awarded yet
    // Actually, usually you award for exact match or milestones. 
    // Let's award for any milestone <= currentStreak that user doesn't have.

    const eligibleBadges = await prisma.streakBadge.findMany({
        where: {
            is_active: true,
            min_streak: { lte: currentStreak }
        }
    });

    for (const badge of eligibleBadges) {
        // Check if user already has this badge
        const existingBadge = await prisma.userBadge.findUnique({
            where: {
                user_id_badge_id: {
                    user_id: userId,
                    badge_id: badge.id
                }
            }
        });

        if (!existingBadge) {
            // Award badge
            await prisma.userBadge.create({
                data: {
                    user_id: userId,
                    badge_id: badge.id
                }
            });

            // Optionally create a notification or user point event for earning a badge
            // For now, just logging
            console.log(`Awarded badge ${badge.name} to user ${userId}`);
        }
    }
}
