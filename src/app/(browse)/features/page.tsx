"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Brain,
	BookOpen,
	Trophy,
	Target,
	GraduationCap,
	Sparkles,
	ArrowRight,
	CheckCircle2,
	Zap,
	Users,
	Globe,
	Shield,
	Play,
	FileText,
	MessageSquare,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.15,
			delayChildren: 0.1
		}
	}
};

const itemVariants = {
	hidden: { opacity: 0, y: 30 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }
	}
};

export default function FeaturesPage() {
	const targetRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: targetRef,
		offset: ["start start", "end start"],
	});

	const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
	const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

	return (
		<div className="min-h-screen bg-white overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
			{/* Hero Section */}
			<section ref={targetRef} className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white">
				{/* Animated Background */}
				<div className="absolute inset-0 pointer-events-none overflow-hidden">
					<motion.div
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.3, 0.5, 0.3]
						}}
						transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
						className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl"
					/>
					<motion.div
						animate={{
							scale: [1.2, 1, 1.2],
							opacity: [0.4, 0.6, 0.4]
						}}
						transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
						className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl"
					/>
					<motion.div
						animate={{
							scale: [1, 1.3, 1],
							opacity: [0.3, 0.4, 0.3]
						}}
						transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
						className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] bg-pink-200/30 rounded-full mix-blend-multiply filter blur-3xl"
					/>
				</div>

				<motion.div
					style={{ opacity: heroOpacity, scale: heroScale }}
					className="container mx-auto relative z-10 px-4 md:px-6"
				>
					<div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm"
						>
							<Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
							<span>Revolutionizing Exam Preparation</span>
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900"
						>
							Master Every Topic with{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
								AI Intelligence
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed"
						>
							Experience a new era of learning where artificial intelligence personalizes your study plan,
							simulates real exams, and helps you achieve mastery faster than ever.
						</motion.p>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							className="flex flex-col sm:flex-row gap-4 pt-4"
						>
							<Link href="/register">
								<Button size="lg" className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
									Get Started Free
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</Link>
							<Link href="/courses">
								<Button size="lg" variant="outline" className="h-12 px-8 text-base border-slate-300 hover:bg-slate-50 transition-all hover:-translate-y-0.5">
									Explore Courses
								</Button>
							</Link>
						</motion.div>
					</div>
				</motion.div>

				{/* Scroll Indicator */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.5 }}
					className="absolute bottom-8 left-1/2 -translate-x-1/2"
				>
					<motion.div
						animate={{ y: [0, 8, 0] }}
						transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
						className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center"
					>
						<motion.div
							animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
							transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
							className="w-1.5 h-3 bg-slate-400 rounded-full mt-2"
						/>
					</motion.div>
				</motion.div>
			</section>

			{/* Features Section */}
			<section className="py-24 bg-slate-50 relative">
				<div className="container mx-auto px-4 md:px-6">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.6 }}
						className="text-center max-w-3xl mx-auto mb-20"
					>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
							Everything You Need to Excel
						</h2>
						<p className="text-lg text-slate-600 leading-relaxed">
							Our platform combines cutting-edge AI with proven learning methodologies to deliver
							results. Discover the tools that will transform your preparation.
						</p>
					</motion.div>

					<motion.div
						variants={containerVariants}
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-50px" }}
						className="flex flex-col gap-8 max-w-6xl mx-auto"
					>
						{/* Feature 1: AI Mock Tests */}
						<motion.div
							variants={itemVariants}
							whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
							className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden group cursor-pointer"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
							<div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

							<div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
								<div className="order-2 md:order-1">
									<div className="p-3 bg-white/10 w-fit rounded-xl mb-6 backdrop-blur-sm border border-white/20">
										<Brain className="w-8 h-8 text-white" />
									</div>
									<h3 className="text-2xl md:text-3xl font-bold mb-4">AI-Powered Mock Tests</h3>
									<p className="text-indigo-100 text-base md:text-lg mb-6 leading-relaxed">
										Experience unlimited practice with our adaptive AI. It analyzes your performance
										in real-time to generate custom questions that target your weak areas and maximize learning efficiency.
									</p>
									<ul className="space-y-3">
										{[
											'Adaptive difficulty that grows with you',
											'Instant detailed explanations',
											'Performance analytics dashboard',
											'Chapter-wise & topic-wise tests'
										].map((item, i) => (
											<motion.li
												key={i}
												className="flex items-center gap-3 text-indigo-50"
												whileHover={{ x: 5 }}
												transition={{ duration: 0.2 }}
											>
												<CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0" />
												{item}
											</motion.li>
										))}
									</ul>
								</div>

								<div className="relative bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md p-6 overflow-hidden order-1 md:order-2 transform group-hover:scale-[1.02] transition-transform duration-300">
									<div className="flex justify-between items-center mb-4">
										<span className="text-xs font-semibold bg-indigo-500/50 px-3 py-1.5 rounded-full text-indigo-100">Physics • Hard</span>
										<span className="text-sm text-indigo-200 font-medium">Q 3/10</span>
									</div>
									<p className="font-medium text-white mb-5 leading-relaxed">If a particle moves in a circle with constant speed, its acceleration is...</p>
									<div className="space-y-2.5">
										{[
											{ text: 'Zero', selected: false },
											{ text: 'Directed tangent to the circle', selected: false },
											{ text: 'Directed towards the center', selected: true },
											{ text: 'Directed away from the center', selected: false }
										].map((option, i) => (
											<motion.div
												key={i}
												whileHover={{ scale: 1.02, x: 3 }}
												className={`p-3 rounded-xl text-sm flex items-center gap-3 cursor-pointer transition-colors ${option.selected
													? 'bg-indigo-500/30 border-2 border-indigo-400 text-white font-medium'
													: 'bg-white/5 border border-white/10 text-indigo-100 hover:bg-white/10'
													}`}
											>
												<div className={`w-4 h-4 rounded-full shrink-0 ${option.selected
													? 'border-[3px] border-indigo-400'
													: 'border border-indigo-300/50'
													}`} />
												{option.text}
											</motion.div>
										))}
									</div>
								</div>
							</div>
						</motion.div>

						{/* Feature 2: Battle Mode */}
						<motion.div
							variants={itemVariants}
							whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
							className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-200 transition-all duration-300 group cursor-pointer"
						>
							<div className="grid md:grid-cols-2 gap-8 items-center">
								<div>
									<div className="p-3 bg-orange-100 w-fit rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
										<Trophy className="w-8 h-8 text-orange-600" />
									</div>
									<h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Battle Mode</h3>
									<p className="text-slate-600 text-base md:text-lg mb-6 leading-relaxed">
										Challenge friends or compete globally in real-time quiz battles. Climb the leaderboards,
										earn achievements, and prove your mastery while having fun learning.
									</p>
									<ul className="space-y-3">
										{[
											'Real-time competitive quizzes',
											'Global & friends leaderboards',
											'Earn points and badges',
											'Weekly tournaments'
										].map((item, i) => (
											<motion.li
												key={i}
												className="flex items-center gap-3 text-slate-700"
												whileHover={{ x: 5 }}
												transition={{ duration: 0.2 }}
											>
												<CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
												{item}
											</motion.li>
										))}
									</ul>
								</div>

								<div className="relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-8 flex items-center justify-center min-h-[280px] overflow-hidden">
									<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.1),transparent_70%)]" />
									<div className="relative z-10 flex items-center gap-6">
										<motion.div
											whileHover={{ scale: 1.1 }}
											className="text-center"
										>
											<div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-4 border-white shadow-lg flex items-center justify-center mb-2">
												<span className="text-sm font-bold text-white">YOU</span>
											</div>
											<motion.span
												className="text-2xl font-black text-indigo-600"
												animate={{ scale: [1, 1.1, 1] }}
												transition={{ duration: 2, repeat: Infinity }}
											>
												8
											</motion.span>
										</motion.div>

										<motion.div
											animate={{ scale: [1, 1.2, 1] }}
											transition={{ duration: 1.5, repeat: Infinity }}
											className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-xl shadow-orange-500/30"
										>
											VS
										</motion.div>

										<motion.div
											whileHover={{ scale: 1.1 }}
											className="text-center"
										>
											<div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border-4 border-white shadow-lg flex items-center justify-center mb-2">
												<span className="text-sm font-bold text-white">OPP</span>
											</div>
											<span className="text-2xl font-black text-purple-600">6</span>
										</motion.div>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Feature 3: AI Tutor */}
						<motion.div
							variants={itemVariants}
							whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
							className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 group cursor-pointer"
						>
							<div className="grid md:grid-cols-2 gap-8 items-center">
								<div className="order-2 md:order-1">
									<div className="p-3 bg-blue-100 w-fit rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
										<GraduationCap className="w-8 h-8 text-blue-600" />
									</div>
									<h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">AI Tutor</h3>
									<p className="text-slate-600 text-base md:text-lg mb-6 leading-relaxed">
										Get 24/7 personalized assistance from your AI study companion. Complex concepts broken down
										into simple explanations in multiple languages including English, Hindi, and Mizo.
									</p>
									<ul className="space-y-3">
										{[
											'Step-by-step concept explanations',
											'Multilingual support (EN, HI, MZ)',
											'Context-aware chapter assistance',
											'Doubt resolution anytime'
										].map((item, i) => (
											<motion.li
												key={i}
												className="flex items-center gap-3 text-slate-700"
												whileHover={{ x: 5 }}
												transition={{ duration: 0.2 }}
											>
												<CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
												{item}
											</motion.li>
										))}
									</ul>
								</div>

								<div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 min-h-[280px] order-1 md:order-2 overflow-hidden">
									<div className="space-y-4">
										<motion.div
											initial={{ x: 20, opacity: 0 }}
											whileInView={{ x: 0, opacity: 1 }}
											transition={{ delay: 0.3 }}
											className="flex justify-end"
										>
											<div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[80%] shadow-sm">
												Explain Quantum Entanglement in simple terms?
											</div>
										</motion.div>
										<motion.div
											initial={{ x: -20, opacity: 0 }}
											whileInView={{ x: 0, opacity: 1 }}
											transition={{ delay: 0.6 }}
											className="flex items-start gap-3"
										>
											<div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
												<Sparkles className="w-4 h-4 text-white" />
											</div>
											<div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-slate-700 shadow-sm border border-blue-100 max-w-[85%]">
												Think of it like two magic dice 🎲 — no matter how far apart they are, when you roll one, the other instantly shows the matching number! That&apos;s quantum entanglement: particles staying connected across any distance.
											</div>
										</motion.div>
										<motion.div
											initial={{ x: -20, opacity: 0 }}
											whileInView={{ x: 0, opacity: 1 }}
											transition={{ delay: 0.9 }}
											className="flex items-center gap-2 text-xs text-slate-500 ml-11"
										>
											<MessageSquare className="w-3 h-3" />
											<span>AI can explain further or give examples...</span>
										</motion.div>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Feature 4: Study Hub */}
						<motion.div
							variants={itemVariants}
							whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
							className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden group cursor-pointer"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
							<div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

							<div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
								<div>
									<div className="p-3 bg-white/10 w-fit rounded-xl mb-6 backdrop-blur-sm border border-white/10">
										<BookOpen className="w-8 h-8 text-emerald-400" />
									</div>
									<h3 className="text-2xl md:text-3xl font-bold mb-4">Study Hub</h3>
									<p className="text-slate-300 text-base md:text-lg mb-6 leading-relaxed">
										Access Zirna IO exclusive digital textbooks for each chapter, AI-generated summaries,
										key terms, flashcards, and specially curated YouTube videos through our API integration.
									</p>
									<div className="flex flex-wrap gap-2 mb-6">
										{[
											{ icon: BookOpen, label: 'Textbooks' },
											{ icon: FileText, label: 'Summaries' },
											{ icon: Target, label: 'Key Terms' },
											{ icon: Zap, label: 'Flashcards' },
											{ icon: Play, label: 'Videos' }
										].map((tag, i) => (
											<motion.span
												key={i}
												whileHover={{ scale: 1.05 }}
												className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-300 flex items-center gap-2 cursor-pointer hover:border-emerald-500/50 transition-colors"
											>
												<tag.icon className="w-3.5 h-3.5 text-emerald-400" /> {tag.label}
											</motion.span>
										))}
									</div>
								</div>

								<div className="relative bg-slate-800/50 rounded-2xl border border-white/5 p-6 backdrop-blur-sm">
									<div className="space-y-3">
										{[
											{ icon: BookOpen, label: "Zirna IO Textbook - Ch. 4", size: "Exclusive", color: "text-emerald-400" },
											{ icon: Target, label: "Key Terms: Thermodynamics", size: "24 Terms", color: "text-blue-400" },
											{ icon: Zap, label: "Flashcards: Heat Transfer", size: "18 Cards", color: "text-amber-400" },
											{ icon: Play, label: "YouTube: Entropy Explained", size: "via API", color: "text-red-400" }
										].map((file, i) => (
											<motion.div
												key={i}
												whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.05)" }}
												className="flex items-center gap-4 p-3 bg-slate-800 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
											>
												<div className={`w-10 h-10 rounded-lg bg-slate-700 shrink-0 flex items-center justify-center ${file.color}`}>
													<file.icon className="w-5 h-5" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="text-sm font-medium text-slate-200 truncate">{file.label}</div>
													<div className="text-xs text-slate-500">{file.size}</div>
												</div>
												<ArrowRight className="w-4 h-4 text-slate-500" />
											</motion.div>
										))}
									</div>
								</div>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Why Choose Us */}
			<section className="py-24 bg-white relative overflow-hidden">
				<div className="container mx-auto px-4 md:px-6">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="text-center max-w-3xl mx-auto mb-16"
					>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
							Why Top Students Choose Zirna
						</h2>
						<p className="text-lg text-slate-600">
							Join thousands of learners who trust our platform for exam success
						</p>
					</motion.div>

					<motion.div
						variants={containerVariants}
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true }}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
					>
						{[
							{ icon: Globe, title: "Global Standards", desc: "Content aligned with international and rigorous board curriculums.", color: "text-indigo-600", bg: "bg-indigo-50" },
							{ icon: Zap, title: "Adaptive Tech", desc: "Algorithms that evolve with you, ensuring you're always challenged.", color: "text-amber-600", bg: "bg-amber-50" },
							{ icon: Shield, title: "Verified Content", desc: "Materials vetted by expert educators for absolute accuracy.", color: "text-emerald-600", bg: "bg-emerald-50" },
							{ icon: Users, title: "Community", desc: "Join a thriving community of learners supporting each other.", color: "text-purple-600", bg: "bg-purple-50" }
						].map((item, i) => (
							<motion.div
								key={i}
								variants={itemVariants}
								whileHover={{ y: -8, transition: { duration: 0.2 } }}
								className="text-center p-8 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 cursor-pointer group"
							>
								<div className={`w-16 h-16 mx-auto ${item.bg} rounded-2xl flex items-center justify-center mb-6 ${item.color} group-hover:scale-110 transition-transform duration-300`}>
									<item.icon className="w-8 h-8" />
								</div>
								<h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
								<p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-24 relative overflow-hidden">
				<div className="absolute inset-0 bg-slate-900">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
				</div>
				<div className="container mx-auto px-4 md:px-6 relative z-10">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-3xl p-12 md:p-20 text-center text-white shadow-2xl overflow-hidden relative"
					>
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_50%)]" />

						<div className="relative z-10 max-w-2xl mx-auto space-y-8">
							<motion.h2
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.2 }}
								className="text-3xl md:text-5xl font-bold tracking-tight"
							>
								Ready to Transform Your Future?
							</motion.h2>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.3 }}
								className="text-lg text-indigo-100 leading-relaxed"
							>
								Join thousands of students who are already learning smarter, not harder.
								Start your journey to exam excellence today.
							</motion.p>
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.4 }}
							>
								<Link href="/register">
									<Button size="lg" className="h-14 px-12 text-lg bg-white text-indigo-600 hover:bg-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
										Start Learning For Free
										<ArrowRight className="ml-2 h-5 w-5" />
									</Button>
								</Link>
							</motion.div>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
