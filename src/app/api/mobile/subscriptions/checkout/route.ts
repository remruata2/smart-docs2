import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";
import { getSmartGateway } from "@/lib/smartgateway";

export async function POST(request: NextRequest) {
    try {
        const user = await getMobileUser(request);
        const userId = Number(user.id);
        const body = await request.json();
        const { planId, billingCycle = "monthly" } = body;

        if (!planId) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        // Get the subscription plan
        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: parseInt(planId) },
        });

        if (!plan || !plan.is_active) {
            return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
        }

        const amount = billingCycle === "yearly" && plan.price_yearly 
            ? Number(plan.price_yearly).toFixed(2) 
            : Number(plan.price_monthly).toFixed(2);

        const orderId = `SUB_${planId}_${userId}_${Date.now().toString().slice(-6)}`;

        // Set mandate end date to 10 years from now
        const mandateEndDate = new Date();
        mandateEndDate.setFullYear(mandateEndDate.getFullYear() + 10);

        // Mobile return URL: a deep link or a simple status page
        // For WebView, we use a special URL that the app can detect
        const returnUrl = `${process.env.NEXTAUTH_URL}/api/mobile/subscriptions/return?order_id=${orderId}`;

        const orderParams = {
            order_id: orderId,
            amount: amount,
            customer_id: userId.toString(),
            customer_email: user.email || "",
            customer_phone: "",
            return_url: returnUrl,
            webhook_url: `${process.env.NEXTAUTH_URL}/api/webhooks/smartgateway`,
            action: "paymentPage",
            description: `Subscription to ${plan.display_name} (${billingCycle})`,
            payment_page_client_id: process.env.SMARTGATEWAY_CLIENT_ID || "",
            // Recurring Mandate Parameters
            options: {
                create_mandate: "REQUIRED"
            },
            mandate: {
                frequency: billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
                amount_type: "FIXED",
                max_amount: amount,
                start_date: Math.floor(Date.now() / 1000),
                end_date: Math.floor(mandateEndDate.getTime() / 1000)
            }
        };

        const smartgateway = getSmartGateway();
        const response = await (smartgateway as any).orderSession.create(orderParams);

        // Log PENDING transaction
        await prisma.paymentTransaction.create({
            data: {
                order_id: orderId,
                user_id: userId,
                plan_id: plan.id,
                amount: parseFloat(amount),
                currency: "INR",
                status: "PENDING",
                description: `Subscription to ${plan.display_name} (${billingCycle})`,
                gateway_order_id: response.id,
            }
        });

        // Upsert UserSubscription as incomplete
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

        await prisma.userSubscription.upsert({
            where: { user_id: userId },
            update: {
                razorpay_order_id: orderId,
                plan_id: plan.id,
                status: "incomplete",
                billing_cycle: billingCycle,
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
            },
            create: {
                user_id: userId,
                razorpay_order_id: orderId,
                plan_id: plan.id,
                status: "incomplete",
                billing_cycle: billingCycle,
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
            },
        });

        const paymentLink = response.payment_links?.web || response.payment_links?.mobile;

        if (!paymentLink) {
            console.error("[MOBILE-SUB-CHECKOUT] No payment link in response");
            return NextResponse.json({ error: "Failed to get payment URL" }, { status: 500 });
        }

        return NextResponse.json({
            paymentLink,
            orderId,
            amount,
            currency: "INR",
            planName: plan.display_name,
        });

    } catch (error: any) {
        if (error.message === "Missing Bearer token" || error.message === "Invalid token") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("[MOBILE-SUB-CHECKOUT] Error:", error);
        return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }
}
