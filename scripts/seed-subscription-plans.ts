import { db } from "../src/lib/db";

async function seedSubscriptionPlans() {
	console.log("🌱 Seeding subscription plans...");

	try {
		// Free Tier Plan (Basic)
		const freePlan = await db.subscriptionPlan.upsert({
			where: { name: "free" },
			update: {
				display_name: "Basic",
				description: "Essential tools for your exam preparation journey",
				features: [
					"Daily Quiz Generation (3/day)",
					"Competitive Battle Mode (3 matches/day)",
					"AI Tutor Assistance (1 session/day, 10 responses)",
					"AI-Powered Chapter Summaries",
					"Smart Flashcards",
					"Curated Video Learning Resources",
				],
				limits: {
					file_uploads: 0, // No file uploads for free plan
					chat_messages: 20,
					exports: 0, // No exports for free plan
					quiz_generation: 3,
					battle_match: 3,
					ai_tutor_session: 1,
				},
			},
			create: {
				name: "free",
				display_name: "Basic",
				description: "Essential tools for your exam preparation journey",
				price_monthly: 0,
				price_yearly: 0,
				features: [
					"Daily Quiz Generation (3/day)",
					"Competitive Battle Mode (3 matches/day)",
					"AI Tutor Assistance (1 session/day, 10 responses)",
					"AI-Powered Chapter Summaries (Unlimited)",
					"Smart Flashcards (Unlimited)",
					"Curated Video Learning Resources (Unlimited)",
				],
				limits: {
					file_uploads: 0,
					chat_messages: 20,
					exports: 0,
					quiz_generation: 3,
					battle_match: 3,
					ai_tutor_session: 1,
				},
				is_active: true,
				is_default: true,
			},
		});

		console.log("✅ Basic (Free) plan created/updated");

		// Premium Tier Plan (Pro)
		const premiumPlan = await db.subscriptionPlan.upsert({
			where: { name: "premium" },
			update: {
				display_name: "Pro",
				description: "Unlock your full potential with unlimited access",
				price_monthly: 299.0, // Rs. 299
				price_yearly: 2990.0, // 10 months for year
				razorpay_plan_id_monthly: "plan_monthly_placeholder", // Replace with real ID
				razorpay_plan_id_yearly: "plan_yearly_placeholder", // Replace with real ID
				features: [
					"Unlimited Quiz Generation",
					"Unlimited Battle Mode Matches",
					"Unlimited AI Tutor Access",
					"AI-Powered Chapter Summaries",
					"Smart Flashcards",
					"Curated Video Learning Resources",
					"Priority Support",
				],
				limits: {
					files: -1,
					chats: -1,
					exports: -1,
					quiz_generation: -1,
					battle_match: -1,
					ai_tutor_session: -1,
				},
			},
			create: {
				name: "premium",
				display_name: "Pro",
				description: "Unlock your full potential with unlimited access",
				price_monthly: 299.0,
				price_yearly: 2990.0,
				razorpay_plan_id_monthly: "plan_RmgcNaSPJXKclu",
				razorpay_plan_id_yearly: "plan_RmgcOCyCK0zrWY",
				features: [
					"Unlimited Quiz Generation",
					"Unlimited Battle Mode Matches",
					"Unlimited AI Tutor Access",
					"AI-Powered Chapter Summaries",
					"Smart Flashcards",
					"Curated Video Learning Resources",
					"Priority Support",
				],
				limits: {
					files: -1,
					chats: -1,
					exports: -1,
					quiz_generation: -1,
					battle_match: -1,
					ai_tutor_session: -1,
				},
				is_active: true,
				is_default: false,
			},
		});

		console.log("✅ Pro (Premium) plan created/updated");

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

