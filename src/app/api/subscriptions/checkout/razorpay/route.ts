import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getSubscriptionPlan } from "@/services/subscription-service";
import { createSubscription, createCustomer } from "@/lib/razorpay";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = parseInt(session.user.id as string);
        const body = await request.json();
        const { planId } = body;

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

        // Get or create Razorpay customer
        const user = await db.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let customerId = user.subscription?.razorpay_customer_id;

        if (!customerId) {
            // Create new Razorpay customer
            // Note: Razorpay customer creation is optional for subscriptions but recommended
            try {
                const customer = await createCustomer(
                    user.email || "",
                    user.username,
                    "" // Contact number if available
                );
                customerId = customer.id;

                // Update user with customer ID if they have a subscription record
                // Or create a placeholder subscription record
                if (user.subscription) {
                    await db.userSubscription.update({
                        where: { user_id: userId },
                        data: { razorpay_customer_id: customerId },
                    });
                }
            } catch (e) {
                console.error("Failed to create Razorpay customer", e);
                // Continue without customer ID if creation fails (optional)
            }
        }

        // Determine which plan ID to use (monthly or yearly)
        // Defaulting to monthly for now
        const razorpayPlanId = plan.razorpay_plan_id_monthly;

        if (!razorpayPlanId) {
            return NextResponse.json(
                { error: "Razorpay plan ID not configured for this plan" },
                { status: 500 }
            );
        }

        // Create subscription
        const subscription = await createSubscription(
            razorpayPlanId,
            customerId || undefined
        );

        // Save subscription ID to database immediately so webhook can find the user
        // Create or update subscription record with pending status
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month from now

        await db.userSubscription.upsert({
            where: { user_id: userId },
            update: {
                razorpay_subscription_id: subscription.id,
                razorpay_customer_id: customerId || null,
                plan_id: plan.id,
                status: "incomplete", // Will be updated to active by webhook
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
            },
            create: {
                user_id: userId,
                razorpay_subscription_id: subscription.id,
                razorpay_customer_id: customerId || null,
                plan_id: plan.id,
                status: "incomplete",
                billing_cycle: "monthly",
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
            },
        });

        return NextResponse.json({
            subscriptionId: subscription.id,
            key: process.env.RAZORPAY_KEY_ID,
            amount: plan.price_monthly, // For display purposes
            currency: "INR",
            name: "Zirna",
            description: `Subscription to ${plan.display_name}`,
            prefill: {
                name: user.username,
                email: user.email,
                contact: "", // Add user phone if available
            },
        });
    } catch (error) {
        console.error("[CHECKOUT] Error creating subscription:", error);
        return NextResponse.json(
            { error: "Failed to create subscription" },
            { status: 500 }
        );
    }
}
