import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);

        const subscription = await prisma.userSubscription.findUnique({
            where: { user_id: userId },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        display_name: true,
                        features: true,
                    }
                }
            }
        });

        if (!subscription) {
            return NextResponse.json({
                hasSubscription: false,
                status: null,
                plan: null,
            });
        }

        const isActive = subscription.status === "active" 
            && subscription.current_period_end > new Date();

        return NextResponse.json({
            hasSubscription: true,
            status: isActive ? "active" : subscription.status,
            plan: subscription.plan,
            billingCycle: subscription.billing_cycle,
            currentPeriodEnd: subscription.current_period_end.toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
    } catch (error: any) {
        if (error.message === "Missing Bearer token" || error.message === "Invalid token") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("[MOBILE-SUB-STATUS] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
