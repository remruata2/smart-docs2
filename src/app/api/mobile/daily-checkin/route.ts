
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";
import { calculateStreak, checkAndAwardBadges } from "@/lib/streak-service";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if user already has "daily_login" points for today
        const existingLoginPoint = await prisma.userPoints.findFirst({
            where: {
                user_id: userId,
                reason: "daily_login",
                created_at: {
                    gte: today
                }
            }
        });

        const result = {
            success: true,
            pointsAdded: 0,
            streak: 0,
            alreadyCheckedIn: !!existingLoginPoint
        };

        if (!existingLoginPoint) {
            // Award 10 points
            await prisma.userPoints.create({
                data: {
                    user_id: userId,
                    points: 10,
                    reason: "daily_login",
                    metadata: { method: "mobile_checkin" }
                }
            });
            result.pointsAdded = 10;
        }

        // Calculate streak and check for badges (Unified Logic)
        const currentStreak = await calculateStreak(userId);
        await checkAndAwardBadges(userId, currentStreak);

        result.streak = currentStreak;

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("[DAILY-CHECKIN] Error:", error.message);
        return NextResponse.json(
            { error: error.message || "Failed to process check-in" },
            { status: error.message.includes("token") ? 401 : 500 }
        );
    }
}
