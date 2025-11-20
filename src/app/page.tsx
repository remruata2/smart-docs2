"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Check,
	BarChart3,
	FileSearch,
	Quote,
	Table2,
	Zap,
	ArrowRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Home() {
	const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
	const observerRef = useRef<IntersectionObserver | null>(null);

	useEffect(() => {
		observerRef.current = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsVisible((prev) => ({
							...prev,
							[entry.target.id]: true,
						}));
					}
				});
			},
			{ threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
		);

		const elements = document.querySelectorAll("[data-animate]");
		elements.forEach((el) => observerRef.current?.observe(el));

		return () => {
			elements.forEach((el) => observerRef.current?.unobserve(el));
			observerRef.current?.disconnect();
		};
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
			<style jsx>{`
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}

				@keyframes scaleIn {
					from {
						opacity: 0;
						transform: scale(0.9);
					}
					to {
						opacity: 1;
						transform: scale(1);
					}
				}

				@keyframes float {
					0%,
					100% {
						transform: translateY(0px);
					}
					50% {
						transform: translateY(-10px);
					}
				}

				.animate-fade-in-up {
					animation: fadeInUp 0.6s ease-out forwards;
				}

				.animate-fade-in {
					animation: fadeIn 0.8s ease-out forwards;
				}

				.animate-scale-in {
					animation: scaleIn 0.5s ease-out forwards;
				}

				.animate-float {
					animation: float 3s ease-in-out infinite;
				}

				.animate-delay-100 {
					animation-delay: 0.1s;
					opacity: 0;
				}

				.animate-delay-200 {
					animation-delay: 0.2s;
					opacity: 0;
				}

				.animate-delay-300 {
					animation-delay: 0.3s;
					opacity: 0;
				}

				.animate-delay-400 {
					animation-delay: 0.4s;
					opacity: 0;
				}

				.card-hover {
					transition: all 0.3s ease;
				}

				.card-hover:hover {
					transform: translateY(-8px);
					box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
						0 10px 10px -5px rgba(0, 0, 0, 0.04);
				}

				.icon-hover {
					transition: all 0.3s ease;
				}

				.card-hover:hover .icon-hover {
					transform: scale(1.1) rotate(5deg);
				}

				.gradient-text {
					background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
			`}</style>

			{/* Header */}
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<div className="text-2xl font-bold text-gray-900 animate-fade-in">
						Smart Docs
					</div>
					<nav className="flex items-center gap-4">
						<Link
							href="/pricing"
							className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
						>
							Pricing
						</Link>
						<Link href="/login">
							<Button
								variant="outline"
								className="transition-all duration-200 hover:scale-105"
							>
								Sign In
							</Button>
						</Link>
						<Link href="/register">
							<Button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
								Get Started
							</Button>
						</Link>
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="container mx-auto px-4 py-20 text-center">
				<div className="animate-fade-in-up">
					<h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
						The AI Analyst for
						<br />
						<span className="gradient-text animate-float">
							Complex Documents
						</span>
					</h1>
					<p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up animate-delay-200">
						Professional-grade document analysis with table-accurate extraction,
						exact citations, deep search capabilities, and intelligent chart
						generation. Built for professionals who need precision, not just
						speed.
					</p>
					<div className="flex gap-4 justify-center animate-fade-in-up animate-delay-300">
						<Link href="/register">
							<Button
								size="lg"
								className="text-lg px-8 transition-all duration-200 hover:scale-105 hover:shadow-xl group"
							>
								Start Free Trial
								<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
							</Button>
						</Link>
						<Link href="/pricing">
							<Button
								size="lg"
								variant="outline"
								className="text-lg px-8 transition-all duration-200 hover:scale-105 hover:shadow-lg"
							>
								View Pricing
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Key Differentiators */}
			<section className="container mx-auto px-4 py-16">
				<div
					id="differentiators"
					data-animate
					className={`transition-all duration-700 ${
						isVisible["differentiators"]
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}
				>
					<h2 className="text-3xl font-bold text-center mb-4 text-gray-900">
						Built for Professional Accuracy
					</h2>
					<p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
						Unlike simple chat interfaces, our AI analyst understands document
						structure, preserves data integrity, and delivers precise answers
						with verifiable sources.
					</p>
				</div>
				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{[
						{
							id: "table-accuracy",
							icon: Table2,
							iconColor: "text-blue-600",
							bgColor: "bg-blue-100",
							borderColor: "border-blue-100 hover:border-blue-300",
							title: "Table-Accuracy",
							description:
								"Layout-aware parsing preserves table structure, ensuring financial data, spreadsheets, and structured content maintain their integrity.",
							features: [
								"Multi-column table preservation",
								"Financial statement accuracy",
								"No data hallucination",
							],
						},
						{
							id: "citations",
							icon: Quote,
							iconColor: "text-green-600",
							bgColor: "bg-green-100",
							borderColor: "border-green-100 hover:border-green-300",
							title: "Exact Citations",
							description:
								"Every answer includes precise source references with page numbers, document titles, and exact locations for verification.",
							features: [
								"Page-level source tracking",
								"Verifiable references",
								"Clickable source links",
							],
						},
						{
							id: "deep-search",
							icon: FileSearch,
							iconColor: "text-purple-600",
							bgColor: "bg-purple-100",
							borderColor: "border-purple-100 hover:border-purple-300",
							title: "Deep Search",
							description:
								"Hybrid search technology combines keyword matching with semantic understanding to find exact IDs, dates, names, and complex analytical queries.",
							features: [
								"Find specific IDs and codes",
								"Aggregation across documents",
								"Multi-document analysis",
							],
						},
						{
							id: "charts",
							icon: BarChart3,
							iconColor: "text-orange-600",
							bgColor: "bg-orange-100",
							borderColor: "border-orange-100 hover:border-orange-300",
							title: "Generating Charts",
							description:
								"Transform data insights into visual charts automatically. Export as PNG, PDF, SVG, or interactive HTML with full data tables.",
							features: [
								"Bar, line, pie, and area charts",
								"Multiple export formats",
								"Data table preservation",
							],
						},
					].map((feature, index) => {
						const Icon = feature.icon;
						return (
							<Card
								key={feature.id}
								id={feature.id}
								data-animate
								className={`card-hover border-2 ${
									feature.borderColor
								} transition-all duration-300 ${
									isVisible[feature.id]
										? "opacity-100 translate-y-0"
										: "opacity-0 translate-y-10"
								}`}
								style={{ transitionDelay: `${index * 100}ms` }}
							>
								<CardHeader>
									<div
										className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4 icon-hover`}
									>
										<Icon className={`h-6 w-6 ${feature.iconColor}`} />
									</div>
									<CardTitle className="group-hover:text-blue-600 transition-colors">
										{feature.title}
									</CardTitle>
									<CardDescription>{feature.description}</CardDescription>
								</CardHeader>
								<CardContent>
									<ul className="space-y-2 text-sm">
										{feature.features.map((item, idx) => (
											<li
												key={idx}
												className="flex items-start gap-2 transition-all duration-200 hover:translate-x-1"
											>
												<Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
												<span>{item}</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</section>

			{/* Technical Advantages */}
			<section className="bg-gray-50 py-16">
				<div className="container mx-auto px-4">
					<div
						id="technical"
						data-animate
						className={`transition-all duration-700 ${
							isVisible["technical"]
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-10"
						}`}
					>
						<h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
							Professional-Grade Architecture
						</h2>
					</div>
					<div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
						{[
							{
								id: "hybrid-search",
								icon: Zap,
								iconColor: "text-blue-600",
								bgColor: "bg-blue-100",
								title: "Hybrid Search Technology",
								description:
									"Combines keyword search (for exact matches) with vector search (for semantic understanding) using Reciprocal Rank Fusion (RRF) to ensure both specific queries and analytical questions get accurate results.",
							},
							{
								id: "layout-aware",
								icon: Table2,
								iconColor: "text-green-600",
								bgColor: "bg-green-100",
								title: "Layout-Aware Processing",
								description:
									"Advanced document parsing preserves table structures, multi-column layouts, and formatting. Financial statements, legal documents, and technical reports maintain their structural integrity for accurate analysis.",
							},
							{
								id: "multi-path",
								icon: FileSearch,
								iconColor: "text-purple-600",
								bgColor: "bg-purple-100",
								title: "Multi-Path Query Logic",
								description:
									"Intelligent routing distinguishes between specific lookups (exact IDs, dates) and analytical queries (trends, aggregations). Each query type uses optimized retrieval strategies for maximum accuracy.",
							},
						].map((tech, index) => {
							const Icon = tech.icon;
							return (
								<div
									key={tech.id}
									id={tech.id}
									data-animate
									className={`text-center transition-all duration-500 ${
										isVisible[tech.id]
											? "opacity-100 translate-y-0"
											: "opacity-0 translate-y-10"
									}`}
									style={{ transitionDelay: `${index * 150}ms` }}
								>
									<div
										className={`w-16 h-16 ${tech.bgColor} rounded-full flex items-center justify-center mx-auto mb-4 icon-hover transition-all duration-300 hover:scale-110`}
									>
										<Icon className={`h-8 w-8 ${tech.iconColor}`} />
									</div>
									<h3 className="text-xl font-semibold mb-2 text-gray-900">
										{tech.title}
									</h3>
									<p className="text-gray-600 text-sm">{tech.description}</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Use Cases */}
			<section className="container mx-auto px-4 py-16">
				<div
					id="use-cases"
					data-animate
					className={`transition-all duration-700 ${
						isVisible["use-cases"]
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
					}`}
				>
					<h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
						Built for Professionals Who Need Accuracy
					</h2>
				</div>
				<div className="grid md:grid-cols-3 gap-8">
					{[
						{
							id: "legal",
							title: "Legal Professionals",
							description:
								"Find exact clauses, case references, and contract terms with precise citations",
							features: [
								"Exact case number lookup",
								"Contract clause extraction",
								"Multi-document case analysis",
							],
						},
						{
							id: "financial",
							title: "Financial Analysts",
							description:
								"Analyze financial statements, balance sheets, and reports with table-accurate data",
							features: [
								"Accurate financial calculations",
								"Trend analysis across periods",
								"Automated chart generation",
							],
						},
						{
							id: "research",
							title: "Research & Compliance",
							description:
								"Deep search across large document archives with verifiable source tracking",
							features: [
								"Aggregate data across files",
								"Compliance verification",
								"Audit trail with citations",
							],
						},
					].map((useCase, index) => (
						<Card
							key={useCase.id}
							id={useCase.id}
							data-animate
							className={`card-hover transition-all duration-500 ${
								isVisible[useCase.id]
									? "opacity-100 translate-y-0"
									: "opacity-0 translate-y-10"
							}`}
							style={{ transitionDelay: `${index * 100}ms` }}
						>
							<CardHeader>
								<CardTitle>{useCase.title}</CardTitle>
								<CardDescription>{useCase.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2 text-sm">
									{useCase.features.map((feature, idx) => (
										<li
											key={idx}
											className="flex items-center gap-2 transition-all duration-200 hover:translate-x-1"
										>
											<Check className="h-4 w-4 text-green-500" />
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					))}
				</div>
			</section>

			{/* CTA Section */}
			<section
				id="cta"
				data-animate
				className={`bg-blue-600 text-white py-16 transition-all duration-700 ${
					isVisible["cta"]
						? "opacity-100 translate-y-0"
						: "opacity-0 translate-y-10"
				}`}
			>
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-4">
						Ready to experience professional-grade document analysis?
					</h2>
					<p className="text-xl mb-8 text-blue-100">
						Join professionals who trust accuracy over speed. Get precise
						answers with verifiable sources.
					</p>
					<Link href="/register">
						<Button
							size="lg"
							variant="secondary"
							className="text-lg px-8 transition-all duration-200 hover:scale-110 hover:shadow-2xl group"
						>
							Start Free Trial
							<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
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
