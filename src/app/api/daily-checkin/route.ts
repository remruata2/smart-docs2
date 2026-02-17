
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";
import { calculateStreak, checkAndAwardBadges } from "@/lib/streak-service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: NextRequest) {
    try {
        let userId: number | null = null;

        // 1. Try Mobile Auth (Bearer Token)
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
            try {
                const user = await getMobileUser(request);
                userId = user.id;
            } catch (e) {
                console.warn("[DAILY-CHECKIN] Mobile auth failed:", e);
            }
        }

        // 2. Try Web Auth (Session) if no mobile user found
        if (!userId) {
            const session = await getServerSession(authOptions);
            if (session?.user?.id) {
                userId = parseInt(session.user.id);
            }
        }

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Core Logic (Shared) ---
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
                    metadata: { method: authHeader ? "mobile_checkin" : "web_checkin" }
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
            { status: 500 }
        );
    }
}
