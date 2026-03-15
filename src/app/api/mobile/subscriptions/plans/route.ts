import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: { is_active: true },
            orderBy: { price_monthly: "asc" },
            select: {
                id: true,
                name: true,
                display_name: true,
                description: true,
                price_monthly: true,
                price_yearly: true,
                features: true,
                limits: true,
                is_default: true,
            }
        });

        const serialized = plans.map(p => ({
            ...p,
            price_monthly: Number(p.price_monthly).toFixed(2),
            price_yearly: p.price_yearly ? Number(p.price_yearly).toFixed(2) : null,
        }));

        return NextResponse.json({ plans: serialized });
    } catch (error) {
        console.error("[MOBILE-PLANS] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
