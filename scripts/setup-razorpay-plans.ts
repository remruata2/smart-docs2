import "dotenv/config";
import { razorpay } from "../src/lib/razorpay";
import { db } from "../src/lib/db";

async function setupRazorpayPlans() {
    console.log("🚀 Setting up Razorpay Plans...");

    try {
        // 1. Create Monthly Plan
        console.log("Creating Monthly Plan...");
        const monthlyPlan = await razorpay.plans.create({
            period: "monthly",
            interval: 1,
            item: {
                name: "Zirna Pro (Monthly)",
                amount: 29900, // Amount in paise (299.00)
                currency: "INR",
                description: "Unlimited access to all features (Monthly)",
            },
        });
        console.log(`✅ Created Monthly Plan: ${monthlyPlan.id}`);

        // 2. Create Yearly Plan
        console.log("Creating Yearly Plan...");
        const yearlyPlan = await razorpay.plans.create({
            period: "yearly",
            interval: 1,
            item: {
                name: "Zirna Pro (Yearly)",
                amount: 299000, // Amount in paise (2990.00)
                currency: "INR",
                description: "Unlimited access to all features (Yearly)",
            },
        });
        console.log(`✅ Created Yearly Plan: ${yearlyPlan.id}`);

        // 3. Update Database
        console.log("Updating database with new Plan IDs...");
        await db.subscriptionPlan.update({
            where: { name: "premium" },
            data: {
                razorpay_plan_id_monthly: monthlyPlan.id,
                razorpay_plan_id_yearly: yearlyPlan.id,
            },
        });

        console.log("🎉 Database updated successfully!");
        console.log("----------------------------------------");
        console.log(`Monthly Plan ID: ${monthlyPlan.id}`);
        console.log(`Yearly Plan ID:  ${yearlyPlan.id}`);
        console.log("----------------------------------------");

    } catch (error) {
        console.error("❌ Error setting up Razorpay plans:", error);
    } finally {
        await db.$disconnect();
    }
}

setupRazorpayPlans();
