import { db } from "../src/lib/db";

async function seedSubscriptionPlans() {
	console.log("🌱 Seeding subscription plans...");

	try {
		// Free Tier Plan
		const freePlan = await db.subscriptionPlan.upsert({
			where: { name: "free" },
			update: {},
			create: {
				name: "free",
				display_name: "Free",
				description: "Perfect for trying out Smart Docs",
				price_monthly: 0,
				price_yearly: 0,
				features: [
					"10 file uploads per month",
					"20 chat messages per day",
					"5 document exports per month",
					"Basic AI models",
					"Watermarked exports",
				],
				limits: {
					files: 10,
					chats: 20,
					exports: 5,
				},
				is_active: true,
				is_default: true,
			},
		});

		console.log("✅ Free plan created/updated");

		// Premium Tier Plan
		const premiumPlan = await db.subscriptionPlan.upsert({
			where: { name: "premium" },
			update: {},
			create: {
				name: "premium",
				display_name: "Premium",
				description: "Unlimited access to all features",
				price_monthly: 29.0,
				price_yearly: 299.0,
				features: [
					"Unlimited file uploads",
					"Unlimited chat messages",
					"Unlimited exports",
					"Access to advanced AI models",
					"Priority processing",
					"API access",
					"White-label options",
					"No watermarks",
				],
				limits: {
					files: -1, // -1 means unlimited
					chats: -1,
					exports: -1,
				},
				is_active: true,
				is_default: false,
			},
		});

		console.log("✅ Premium plan created/updated");

		console.log("\n🎉 Subscription plans seeded successfully!");
		console.log(`   - Free Plan (ID: ${freePlan.id})`);
		console.log(`   - Premium Plan (ID: ${premiumPlan.id})`);
	} catch (error) {
		console.error("❌ Error seeding subscription plans:", error);
		throw error;
	} finally {
		await db.$disconnect();
	}
}

seedSubscriptionPlans()
	.then(() => {
		console.log("\n✨ Done!");
		process.exit(0);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

