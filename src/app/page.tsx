"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Check,
	Brain,
	BookOpen,
	Trophy,
	Target,
	GraduationCap,
	Sparkles,
	ArrowRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";

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
					background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
			`}</style>

			{/* Header */}
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<Link href="/" className="animate-fade-in">
						<Image
							src="/zirnalogosmall.png"
							alt="Zirna"
							width={120}
							height={40}
							className="h-10 w-auto"
						/>
					</Link>
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
						Your AI-Powered Companion for
						<br />
						<span className="gradient-text animate-float">
							Exam Excellence
						</span>
					</h1>
					<p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up animate-delay-200">
						Master your exams with AI-generated quizzes, smart study materials,
						and gamified learning. Built for students across boards, institutions,
						and competitive exams who need results.
					</p>
					<div className="flex gap-4 justify-center animate-fade-in-up animate-delay-300">
						<Link href="/register">
							<Button
								size="lg"
								className="text-lg px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 hover:shadow-xl group"
							>
								Start Learning Free
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

			{/* Key Features */}
			<section className="container mx-auto px-4 py-16">
				<div
					id="features"
					data-animate
					className={`transition-all duration-700 ${isVisible["features"]
						? "opacity-100 translate-y-0"
						: "opacity-0 translate-y-10"
						}`}
				>
					<h2 className="text-3xl font-bold text-center mb-4 text-gray-900">
						Everything You Need to Excel
					</h2>
					<p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
						From AI-generated practice questions to gamified learning experiences,
						we provide comprehensive tools to help you succeed in your exams.
					</p>
				</div>
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[
						{
							id: "ai-quizzes",
							icon: Brain,
							iconColor: "text-indigo-600",
							bgColor: "bg-indigo-100",
							borderColor: "border-indigo-100 hover:border-indigo-300",
							title: "AI-Generated Quizzes",
							description:
								"Practice with unlimited custom quizzes tailored to your subjects and chapters. Multiple question types including MCQs, fill-in-the-blanks, and more.",
							features: [
								"Chapter-specific questions",
								"5 types of question formats",
								"Instant feedback & explanations",
							],
						},
						{
							id: "battle-mode",
							icon: Target,
							iconColor: "text-red-600",
							bgColor: "bg-red-100",
							borderColor: "border-red-100 hover:border-red-300",
							title: "Quiz Battle Mode",
							description:
								"Challenge your friends or random opponents in real-time quiz battles. Compete head-to-head and climb the leaderboard while learning.",
							features: [
								"Real-time competitive quizzes",
								"Challenge friends or random matches",
								"Earn points and achievements",
							],
						},
						{
							id: "ai-tutor",
							icon: GraduationCap,
							iconColor: "text-blue-600",
							bgColor: "bg-blue-100",
							borderColor: "border-blue-100 hover:border-blue-300",
							title: "AI Learning Tutor",
							description:
								"Get personalized help from your AI tutor that breaks down complex topics into simple, easy-to-understand explanations tailored to your learning pace.",
							features: [
								"Step-by-step chapter guidance",
								"Simplified explanations",
								"24/7 personalized assistance",
							],
						},
						{
							id: "study-materials",
							icon: BookOpen,
							iconColor: "text-green-600",
							bgColor: "bg-green-100",
							borderColor: "border-green-100 hover:border-green-300",
							title: "Smart Study Materials",
							description:
								"Access organized content by board, institution, and program. All your textbooks and study materials in one place with AI-powered summaries.",
							features: [
								"Multi-board support (CBSE, MBSE, etc.)",
								"Chapter-wise organization",
								"AI-generated summaries & flashcards",
							],
						},
						{
							id: "gamification",
							icon: Sparkles,
							iconColor: "text-purple-600",
							bgColor: "bg-purple-100",
							borderColor: "border-purple-100 hover:border-purple-300",
							title: "Gamified Learning",
							description:
								"Earn points for every quiz, climb the leaderboards, and stay motivated with achievements. Learning made fun and engaging.",
							features: [
								"Points for every activity",
								"Achievement badges",
								"Progress tracking",
							],
						},
						{
							id: "leaderboards",
							icon: Trophy,
							iconColor: "text-orange-600",
							bgColor: "bg-orange-100",
							borderColor: "border-orange-100 hover:border-orange-300",
							title: "Compete & Excel",
							description:
								"See how you rank against peers in your institution and board. Friendly competition that drives excellence.",
							features: [
								"Institution rankings",
								"Board-wide leaderboards",
								"Performance insights",
							],
						},
					].map((feature, index) => {
						const Icon = feature.icon;
						return (
							<Card
								key={feature.id}
								id={feature.id}
								data-animate
								className={`card-hover border-2 ${feature.borderColor
									} transition-all duration-300 ${isVisible[feature.id]
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

			{/* How It Works */}
			<section className="bg-gray-50 py-16">
				<div className="container mx-auto px-4">
					<div
						id="how-it-works"
						data-animate
						className={`transition-all duration-700 ${isVisible["how-it-works"]
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-10"
							}`}
					>
						<h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
							Powered by Advanced AI Technology
						</h2>
					</div>
					<div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
						{[
							{
								id: "board-filtering",
								icon: Target,
								iconColor: "text-indigo-600",
								bgColor: "bg-indigo-100",
								title: "Board-Specific Content",
								description:
									"Content filtered by your board, institution, and program ensures you only study what matters for your exams. Zero irrelevant material, maximum focus.",
							},
							{
								id: "adaptive-learning",
								icon: Brain,
								iconColor: "text-green-600",
								bgColor: "bg-green-100",
								title: "Adaptive Learning Paths",
								description:
									"AI tracks your performance and adapts question difficulty. Focus on weak areas automatically while maintaining strengths for optimal learning.",
							},
							{
								id: "analytics",
								icon: GraduationCap,
								iconColor: "text-purple-600",
								bgColor: "bg-purple-100",
								title: "Comprehensive Analytics",
								description:
									"Detailed insights into your performance by subject, chapter, and question type. Identify patterns and improve strategically.",
							},
						].map((tech, index) => {
							const Icon = tech.icon;
							return (
								<div
									key={tech.id}
									id={tech.id}
									data-animate
									className={`text-center transition-all duration-500 ${isVisible[tech.id]
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
					className={`transition-all duration-700 ${isVisible["use-cases"]
						? "opacity-100 translate-y-0"
						: "opacity-0 translate-y-10"
						}`}
				>
					<h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
						Built for Every Learning Journey
					</h2>
				</div>
				<div className="grid md:grid-cols-3 gap-8">
					{[
						{
							id: "students",
							title: "K-12 Students",
							description:
								"Master your board exams with chapter-specific quizzes and study materials organized by your syllabus",
							features: [
								"CBSE, MBSE, State boards",
								"Subject and chapter-wise practice",
								"Track progress and improve",
							],
						},
						{
							id: "aspirants",
							title: "Competitive Exam Aspirants",
							description:
								"Prepare for UPSC, IIT-JEE, NEET, and other competitive exams with targeted practice and AI assistance",
							features: [
								"Exam-specific content",
								"Previous year questions pattern",
								"Performance analytics",
							],
						},
						{
							id: "educators",
							title: "Educators & Institutions",
							description:
								"Monitor student progress, assign quizzes, and manage learning outcomes for your entire institution",
							features: [
								"Bulk student management",
								"Custom content upload",
								"Institution-wide analytics",
							],
						},
					].map((useCase, index) => (
						<Card
							key={useCase.id}
							id={useCase.id}
							data-animate
							className={`card-hover transition-all duration-500 ${isVisible[useCase.id]
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
				className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16 transition-all duration-700 ${isVisible["cta"]
					? "opacity-100 translate-y-0"
					: "opacity-0 translate-y-10"
					}`}
			>
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-4">
						Ready to ace your exams with AI?
					</h2>
					<p className="text-xl mb-8 text-indigo-100">
						Join thousands of students who are already learning smarter,
						not harder. Start your journey to exam excellence today.
					</p>
					<Link href="/register">
						<Button
							size="lg"
							variant="secondary"
							className="text-lg px-8 transition-all duration-200 hover:scale-110 hover:shadow-2xl group"
						>
							Start Learning Free
							<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
			</section>

			{/* Footer */}
			<Footer />
		</div>
	);
}
