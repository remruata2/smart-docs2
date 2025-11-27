"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import Image from "next/image";

interface Plan {
	id: number;
	name: string;
	display_name: string;
	description: string | null;
	price_monthly: string;
	price_yearly: string | null;
	features: string[];
	limits: any;
}

export default function PricingPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(true);
	const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);

	useEffect(() => {
		// Fetch plans from API (since this is now a client component)
		// Or we could pass them as props if we kept the page server-side and used a client component for the card
		// For simplicity, let's fetch
		async function fetchPlans() {
			try {
				const response = await fetch("/api/subscriptions/plans");
				if (response.ok) {
					const data = await response.json();
					setPlans(data);
				}
			} catch (error) {
				console.error("Failed to fetch plans", error);
			} finally {
				setLoading(false);
			}
		}
		fetchPlans();
	}, []);

	const handleSubscribe = async (planId: number) => {
		if (!session) {
			router.push("/login?callbackUrl=/pricing");
			return;
		}

		setProcessingPlanId(planId);

		try {
			const response = await fetch("/api/subscriptions/checkout/razorpay", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ planId }),
			});

			if (!response.ok) {
				throw new Error("Failed to initiate checkout");
			}

			const data = await response.json();

			const options = {
				key: data.key,
				subscription_id: data.subscriptionId,
				name: data.name,
				description: data.description,
				handler: async function (response: any) {
					// Handle success
					// You might want to call an API to verify payment signature here
					// or just redirect to success page
					console.log("Payment successful", response);
					router.push("/subscriptions/success");
				},
				prefill: data.prefill,
				theme: {
					color: "#3B82F6",
				},
			};

			const rzp = new (window as any).Razorpay(options);
			rzp.open();
		} catch (error) {
			console.error("Checkout error:", error);
			alert("Failed to start checkout. Please try again.");
		} finally {
			setProcessingPlanId(null);
		}
	};

	if (loading) {
		return <div className="min-h-screen flex items-center justify-center">Loading plans...</div>;
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
			<Script src="https://checkout.razorpay.com/v1/checkout.js" />

			{/* Header */}
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<Link href="/" className="flex items-center">
						<Image
							src="/zirnalogosmall.png"
							alt="Zirna"
							width={120}
							height={40}
							className="h-10 w-auto"
						/>
					</Link>
					<nav className="flex items-center gap-4">
						<Link href="/" className="text-gray-600 hover:text-gray-900">
							Home
						</Link>
						{!session && (
							<Link href="/login">
								<Button variant="outline">Sign In</Button>
							</Link>
						)}
					</nav>
				</div>
			</header>

			{/* Pricing Section */}
			<section className="container mx-auto px-4 py-20">
				<div className="text-center mb-16">
					<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
						Simple, Transparent Pricing
					</h1>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						Choose the plan that works best for you. Start free and upgrade when you need more.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{plans.map((plan) => {
						const features = (plan.features as string[]) || [];
						const isFree = parseFloat(plan.price_monthly) === 0;
						const isPopular = plan.name === "premium";

						return (
							<Card
								key={plan.id}
								className={isPopular ? "border-blue-500 border-2 shadow-lg" : ""}
							>
								{isPopular && (
									<div className="bg-blue-500 text-white text-center py-2 text-sm font-semibold">
										Most Popular
									</div>
								)}
								<CardHeader>
									<CardTitle className="text-2xl">{plan.display_name}</CardTitle>
									<CardDescription>{plan.description}</CardDescription>
									<div className="mt-4">
										{isFree ? (
											<div className="text-4xl font-bold">Free</div>
										) : (
											<div>
												<span className="text-4xl font-bold">₹{plan.price_monthly}</span>
												<span className="text-gray-600">/month</span>
											</div>
										)}
										{!isFree && plan.price_yearly && (
											<div className="text-sm text-gray-600 mt-2">
												or ₹{plan.price_yearly}/year
											</div>
										)}
									</div>
								</CardHeader>
								<CardContent>
									<ul className="space-y-3 mb-6">
										{features.map((feature, index) => (
											<li key={index} className="flex items-start gap-2">
												<Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
												<span className="text-sm">{feature}</span>
											</li>
										))}
									</ul>

									{isFree ? (
										<Link href="/login">
											<Button
												className="w-full"
												variant={isPopular ? "default" : "outline"}
												size="lg"
											>
												Get Started Free
											</Button>
										</Link>
									) : (
										<Button
											className="w-full"
											variant={isPopular ? "default" : "outline"}
											size="lg"
											onClick={() => handleSubscribe(plan.id)}
											disabled={processingPlanId === plan.id}
										>
											{processingPlanId === plan.id ? "Processing..." : "Subscribe Now"}
										</Button>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>

				{/* FAQ Section */}
				<div className="mt-20 max-w-3xl mx-auto">
					<h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Can I change plans later?</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600">
									Yes! You can upgrade or downgrade your plan at any time. Changes take effect
									immediately.
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600">
									We accept all major credit cards, debit cards, UPI, and net banking via Razorpay.
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Is there a free trial?</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600">
									Yes! Our free tier allows you to try all features with usage limits.
								</p>
							</CardContent>
						</Card>
					</div>

					<p className="text-center text-sm text-gray-600 mt-8">
						By subscribing, you agree to our{" "}
						<Link href="/terms" className="text-blue-600 hover:underline">
							Terms of Service
						</Link>{" "}
						and{" "}
						<Link href="/privacy" className="text-blue-600 hover:underline">
							Privacy Policy
						</Link>
						.
					</p>
				</div>
			</section>

			{/* Footer */}
			<Footer />
		</div>
	);
}

