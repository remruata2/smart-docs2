import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSubscriptionPlan } from "@/services/subscription-service";
import { getSmartGateway } from "@/lib/smartgateway";
import { db } from "@/lib/db";
import { validateCsrf } from "@/lib/csrf-protection";

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Validate CSRF
        const csrfResult = validateCsrf(request);
        if (!csrfResult.valid) {
            console.warn(`[SUBSCRIPTION-CHECKOUT-SG] CSRF validation failed: ${csrfResult.error}`);
            return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
        }

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id as string);
        const body = await request.json();
        const { planId, billingCycle = "monthly" } = body;

        if (!planId) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        // Get the subscription plan
        const plan = await getSubscriptionPlan(parseInt(planId));

        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }

        if (!plan.is_active) {
            return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const amount = billingCycle === "yearly" && plan.price_yearly 
            ? Number(plan.price_yearly).toFixed(2) 
            : Number(plan.price_monthly).toFixed(2);

        // For SmartGateway Subscriptions/Mandates, you usually create an order with special flag or use a Mandate API.
        // Assuming we are doing a standard payment order for the first payment that can act as a subscription initiation.
        const orderId = `SUB_${planId}_${userId}_${Date.now().toString().slice(-6)}`;

        // Set mandate end date to 10 years from now by default
        const mandateEndDate = new Date();
        mandateEndDate.setFullYear(mandateEndDate.getFullYear() + 10);

        const orderParams = {
            order_id: orderId,
            amount: amount,
            customer_id: userId.toString(),
            customer_email: user.email || "",
            customer_phone: "", 
            return_url: `${process.env.NEXTAUTH_URL}/api/payments/smartgateway/return?destination=/app/dashboard&payment=success`, // Bridge route
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

        // console.log("[SUBSCRIPTION-CHECKOUT-SG] Full SmartGateway response:", JSON.stringify(response, null, 2));

        // The web checkout uses payment_links.web for redirect, similar to course checkout
        const paymentLink = response.payment_links?.web || response.payment_links?.mobile;
        const sdkPayload = response.sdk_payload;

        if (!paymentLink && !sdkPayload) {
            console.error("[SUBSCRIPTION-CHECKOUT-SG] No payment_links or sdk_payload in response");
            throw new Error("Failed to get payment URL from SmartGateway");
        }

        // Log the pending subscription order in the db. 
        // We temporarily store the SmartGateway order ID in the razorpay field until schema is updated.
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

        await db.userSubscription.upsert({
            where: { user_id: userId },
            update: {
                razorpay_order_id: orderId, // Note: repurposing this field temporarily
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

        return NextResponse.json({
            paymentLink: paymentLink || null,
            sdkPayload: sdkPayload || null,
            orderId: orderId,
            amount: amount,
            currency: "INR",
            name: "Zirna",
            description: `Subscription to ${plan.display_name}`,
        });
    } catch (error) {
        console.error("[SUBSCRIPTION-CHECKOUT-SG] Error creating subscription order:", error);
        return NextResponse.json(
            { error: "Failed to create subscription checkout" },
            { status: 500 }
        );
    }
}
