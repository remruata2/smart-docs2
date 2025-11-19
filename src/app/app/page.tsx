import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getAllCurrentUsage } from "@/lib/usage-tracking";
import { getUserSubscription, getSubscriptionPlan } from "@/services/subscription-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	const userId = parseInt(session.user.id as string);

	// Get user subscription and usage
	const [subscription, usage] = await Promise.all([
		getUserSubscription(userId),
		getAllCurrentUsage(userId),
	]);

	const plan = subscription
		? await getSubscriptionPlan(subscription.plan_id)
		: await getSubscriptionPlan(
				(await require("@/services/subscription-service").getDefaultPlan())?.id || 1
		  );

	const limits = plan?.limits as { files: number; chats: number; exports: number } | undefined;

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
					<p className="text-gray-600 mt-2">Manage your subscription and usage</p>
				</div>

				<div className="grid md:grid-cols-2 gap-6 mb-8">
					{/* Current Plan */}
					<Card>
						<CardHeader>
							<CardTitle>Current Plan</CardTitle>
							<CardDescription>Your active subscription plan</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<div className="flex items-center justify-between mb-2">
										<span className="text-2xl font-bold">{plan?.display_name}</span>
										{subscription?.status === "active" ? (
											<Badge className="bg-green-500">Active</Badge>
										) : (
											<Badge variant="outline">Inactive</Badge>
										)}
									</div>
									{Number(plan?.price_monthly) === 0 ? (
										<div className="text-3xl font-bold text-gray-900">Free</div>
									) : (
										<div>
											<span className="text-3xl font-bold">${plan?.price_monthly?.toString()}</span>
											<span className="text-gray-600">/month</span>
										</div>
									)}
								</div>
								{subscription && (
									<div className="text-sm text-gray-600">
										<p>
											Renews:{" "}
											{new Date(subscription.current_period_end).toLocaleDateString()}
										</p>
									</div>
								)}
								<Link href="/pricing">
									<Button variant="outline" className="w-full">
										{subscription ? "Change Plan" : "Upgrade Plan"}
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					{/* Usage Statistics */}
					<Card>
						<CardHeader>
							<CardTitle>Usage This Month</CardTitle>
							<CardDescription>Your current usage statistics</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{limits && (
									<>
										<div>
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm font-medium">File Uploads</span>
												<span className="text-sm text-gray-600">
													{usage.file_upload} / {limits.files === -1 ? "∞" : limits.files}
												</span>
											</div>
											{limits.files !== -1 && (
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className={`h-2 rounded-full ${
															usage.file_upload >= limits.files
																? "bg-red-500"
																: usage.file_upload >= limits.files * 0.8
																	? "bg-yellow-500"
																	: "bg-green-500"
														}`}
														style={{
															width: `${Math.min((usage.file_upload / limits.files) * 100, 100)}%`,
														}}
													/>
												</div>
											)}
										</div>
										<div>
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm font-medium">Chat Messages</span>
												<span className="text-sm text-gray-600">
													{usage.chat_message} / {limits.chats === -1 ? "∞" : limits.chats}
												</span>
											</div>
											{limits.chats !== -1 && (
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className={`h-2 rounded-full ${
															usage.chat_message >= limits.chats
																? "bg-red-500"
																: usage.chat_message >= limits.chats * 0.8
																	? "bg-yellow-500"
																	: "bg-green-500"
														}`}
														style={{
															width: `${Math.min((usage.chat_message / limits.chats) * 100, 100)}%`,
														}}
													/>
												</div>
											)}
										</div>
										<div>
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm font-medium">Exports</span>
												<span className="text-sm text-gray-600">
													{usage.document_export} / {limits.exports === -1 ? "∞" : limits.exports}
												</span>
											</div>
											{limits.exports !== -1 && (
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className={`h-2 rounded-full ${
															usage.document_export >= limits.exports
																? "bg-red-500"
																: usage.document_export >= limits.exports * 0.8
																	? "bg-yellow-500"
																	: "bg-green-500"
														}`}
														style={{
															width: `${Math.min((usage.document_export / limits.exports) * 100, 100)}%`,
														}}
													/>
												</div>
											)}
										</div>
									</>
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Plan Features */}
				<Card>
					<CardHeader>
						<CardTitle>Plan Features</CardTitle>
						<CardDescription>What's included in your current plan</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{(plan?.features as string[])?.map((feature, index) => (
								<li key={index} className="flex items-center gap-2">
									<Check className="h-5 w-5 text-green-500" />
									<span>{feature}</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

