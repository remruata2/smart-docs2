import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";

async function CheckoutSuccessContent() {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
						<Check className="h-8 w-8 text-green-600" />
					</div>
					<CardTitle className="text-2xl">Subscription Successful!</CardTitle>
					<CardDescription>
						Your subscription has been activated successfully.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-center text-gray-600">
						You now have access to all premium features. Start using Smart Docs to its full
						potential!
					</p>
					<Link href="/app">
						<Button className="w-full">Go to App</Button>
					</Link>
					<Link href="/admin">
						<Button variant="outline" className="w-full">
							Start Using Smart Docs
						</Button>
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}

export default function CheckoutSuccessPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<CheckoutSuccessContent />
		</Suspense>
	);
}

