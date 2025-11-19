import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function Home() {
	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
			{/* Header */}
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<div className="text-2xl font-bold text-gray-900">Smart Docs</div>
					<nav className="flex items-center gap-4">
						<Link href="/pricing" className="text-gray-600 hover:text-gray-900">
							Pricing
						</Link>
					<Link href="/login">
						<Button variant="outline">Sign In</Button>
					</Link>
					<Link href="/register">
						<Button>Get Started</Button>
					</Link>
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="container mx-auto px-4 py-20 text-center">
				<h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
					AI-Powered Document
					<br />
					<span className="text-blue-600">Management & Analysis</span>
				</h1>
				<p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
					Transform your documents into intelligent knowledge. Upload, chat, and extract insights
					with advanced AI technology.
				</p>
				<div className="flex gap-4 justify-center">
					<Link href="/register">
						<Button size="lg" className="text-lg px-8">
							Start Free Trial
						</Button>
					</Link>
					<Link href="/pricing">
						<Button size="lg" variant="outline" className="text-lg px-8">
							View Pricing
						</Button>
					</Link>
				</div>
			</section>

			{/* Features Section */}
			<section className="container mx-auto px-4 py-16">
				<h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
					Everything you need to manage documents intelligently
				</h2>
				<div className="grid md:grid-cols-3 gap-8">
					<Card>
						<CardHeader>
							<CardTitle>AI-Powered Chat</CardTitle>
							<CardDescription>
								Ask questions about your documents and get instant, intelligent answers
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Natural language queries</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Context-aware responses</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Multiple AI models</span>
								</li>
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Smart Document Processing</CardTitle>
							<CardDescription>
								Upload documents in various formats and let AI extract and organize information
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">PDF, DOCX, and more</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Automatic categorization</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Semantic search</span>
								</li>
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Export & Share</CardTitle>
							<CardDescription>
								Export your documents and conversations in multiple formats
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2">
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">PDF export</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Markdown format</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="h-4 w-4 text-green-500" />
									<span className="text-sm">Conversation history</span>
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* CTA Section */}
			<section className="bg-blue-600 text-white py-16">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
					<p className="text-xl mb-8 text-blue-100">
						Join thousands of users managing their documents with AI
					</p>
					<Link href="/register">
						<Button size="lg" variant="secondary" className="text-lg px-8">
							Start Free Trial
						</Button>
					</Link>
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
