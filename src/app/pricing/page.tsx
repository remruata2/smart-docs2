import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { getActivePlans } from "@/services/subscription-service";

export default async function PricingPage() {
	const plans = await getActivePlans();

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
			{/* Header */}
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<Link href="/" className="text-2xl font-bold text-gray-900">
						Smart Docs
					</Link>
					<nav className="flex items-center gap-4">
						<Link href="/" className="text-gray-600 hover:text-gray-900">
							Home
						</Link>
						<Link href="/login">
							<Button variant="outline">Sign In</Button>
						</Link>
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
						const limits = plan.limits as { files: number; chats: number; exports: number };
						const isFree = plan.price_monthly.toNumber() === 0;
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
												<span className="text-4xl font-bold">${plan.price_monthly.toString()}</span>
												<span className="text-gray-600">/month</span>
											</div>
										)}
										{!isFree && plan.price_yearly && (
											<div className="text-sm text-gray-600 mt-2">
												or ${plan.price_yearly.toString()}/year (save ${plan.price_monthly.toNumber() * 12 - plan.price_yearly.toNumber()})
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
									{limits.files === -1 ? (
										<div className="text-sm text-gray-600 mb-4">
											✓ Unlimited file uploads
										</div>
									) : (
										<div className="text-sm text-gray-600 mb-4">
											✓ {limits.files} file uploads per month
										</div>
									)}
									{limits.chats === -1 ? (
										<div className="text-sm text-gray-600 mb-4">
											✓ Unlimited chat messages
										</div>
									) : (
										<div className="text-sm text-gray-600 mb-4">
											✓ {limits.chats} chat messages per day
										</div>
									)}
									{limits.exports === -1 ? (
										<div className="text-sm text-gray-600 mb-4">
											✓ Unlimited exports
										</div>
									) : (
										<div className="text-sm text-gray-600 mb-4">
											✓ {limits.exports} exports per month
										</div>
									)}
									<Link href={isFree ? "/login" : `/api/subscriptions/checkout?planId=${plan.id}`}>
										<Button
											className="w-full"
											variant={isPopular ? "default" : "outline"}
											size="lg"
										>
											{isFree ? "Get Started Free" : "Subscribe Now"}
										</Button>
									</Link>
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
									immediately, and we'll prorate any charges.
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600">
									We accept all major credit cards through Stripe. All payments are secure and
									encrypted.
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Is there a free trial?</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600">
									Yes! Our free tier allows you to try all features with usage limits. No credit
									card required.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8 mt-16">
				<div className="container mx-auto px-4 text-center text-gray-600">
					<p>&copy; 2025 Smart Docs. All rights reserved.</p>
				</div>
			</footer>
		</div>
	);
}

