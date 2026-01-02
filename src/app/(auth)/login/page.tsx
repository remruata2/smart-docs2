"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Lock, User, AlertCircle, BookOpen, Brain, GraduationCap, Sparkles, ArrowLeft } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const router = useRouter();
	const { data: session, status } = useSession();
	const userRole = session?.user?.role;
	const isSessionLoading = status === "loading";
	const isSessionAuthenticated = status === "authenticated";

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		const handleSmartRedirect = async () => {
			if (isSessionAuthenticated) {
				try {
					const res = await fetch("/api/auth/redirect");
					const data = await res.json();
					router.replace(data.redirect || "/");
				} catch {
					// Fallback: admin to /admin, others to my-learning
					const destination = userRole === "admin" ? "/admin" : "/my-learning";
					router.replace(destination);
				}
			}
		};
		handleSmartRedirect();
	}, [isSessionAuthenticated, router, userRole]);
	const isFormDisabled = isLoading || isSessionLoading || isSessionAuthenticated || !isMounted;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const result = await signIn("credentials", {
				redirect: false,
				username,
				password,
			});

			if (result?.error) {
				setError("Invalid username or password");
				setIsLoading(false);
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
			const sessionResponse = await fetch("/api/auth/session");
			const session = await sessionResponse.json();

			if (session?.user?.role === "admin") {
				router.replace("/admin");
			} else {
				// Use smart redirect for students
				try {
					const res = await fetch("/api/auth/redirect");
					const data = await res.json();
					router.replace(data.redirect || "/my-learning");
				} catch {
					router.replace("/my-learning");
				}
			}
		} catch (err) {
			console.error("Login error:", err);
			setError("An error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
			{isSessionAuthenticated && (
				<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm px-6 text-center">
					<Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
					<p className="text-base font-semibold text-gray-800">Checking your session...</p>
					<p className="text-sm text-gray-500 mt-1">Hang tight while we redirect you to your dashboard.</p>
				</div>
			)}
			{/* Mobile Header - Compact branding */}
			<div className="lg:hidden bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
				<div className="absolute top-4 left-4">
					<Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium hover:text-white/80 transition-colors bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/10 uppercase tracking-wider">
						<ArrowLeft className="w-3.5 h-3.5" />
						Home
					</Link>
				</div>
				<div className="flex flex-col items-center pt-8">
					<Link href="/" className="mb-2">
						<Image
							src="/zirnalogosmall.png"
							alt="Zirna"
							width={140}
							height={46}
							className="h-10 w-auto brightness-0 invert"
							priority
							unoptimized
						/>
					</Link>
					<p className="text-center text-white/90 text-sm">
						Your AI-powered exam prep companion
					</p>
				</div>
			</div>

			<div className="flex-1 flex flex-col lg:flex-row">
				{/* Desktop Left Panel - Branding (Hidden on mobile) */}
				<div className="hidden lg:flex relative lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 lg:p-12 items-center justify-center overflow-hidden">
					{/* Animated Background Elements */}
					<div className="absolute inset-0 opacity-20">
						<div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" />
						<div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-700" />
						<div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-1000" />
					</div>

					{/* Back Button */}
					<div className="absolute top-8 left-8">
						<Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 hover:bg-white/20 group">
							<ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
							Back to Home
						</Link>
					</div>

					{/* Content */}
					<div className="relative z-10 max-w-md text-white">
						<div className="mb-10">
							<Link href="/" className="inline-block">
								<Image
									src="/zirnalogosmall.png"
									alt="Zirna"
									width={180}
									height={60}
									className="h-12 w-auto brightness-0 invert"
									priority
									unoptimized
								/>
							</Link>
						</div>

						<p className="text-xl text-white/90 mb-8 leading-relaxed">
							Your AI-powered companion for exam preparation and academic excellence.
						</p>

						<div className="space-y-6">
							<div className="flex items-start gap-4 group">
								<div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg group-hover:bg-white/20 transition-all">
									<Brain className="w-6 h-6" />
								</div>
								<div>
									<h3 className="font-semibold text-lg mb-1">AI-Generated Quizzes</h3>
									<p className="text-white/80 text-sm">Practice with custom quizzes tailored to your subjects and chapters</p>
								</div>
							</div>

							<div className="flex items-start gap-4 group">
								<div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg group-hover:bg-white/20 transition-all">
									<BookOpen className="w-6 h-6" />
								</div>
								<div>
									<h3 className="font-semibold text-lg mb-1">Smart Study Materials</h3>
									<p className="text-white/80 text-sm">Access organized content by board, institution, and program</p>
								</div>
							</div>

							<div className="flex items-start gap-4 group">
								<div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg group-hover:bg-white/20 transition-all">
									<Sparkles className="w-6 h-6" />
								</div>
								<div>
									<h3 className="font-semibold text-lg mb-1">Gamified Learning</h3>
									<p className="text-white/80 text-sm">Earn points and compete on leaderboards while you learn</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Right Panel - Login Form */}
				<div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-gray-50 to-gray-100">
					<div className="w-full max-w-md">
						<Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
							<CardHeader className="space-y-1 pb-6">
								<CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
									Welcome Back
								</CardTitle>
								<CardDescription className="text-center text-base">
									Sign in to continue your learning journey
								</CardDescription>
							</CardHeader>

							{error && (
								<div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2 duration-300">
									<AlertCircle className="h-5 w-5 flex-shrink-0" />
									<p className="text-sm font-medium">{error}</p>
								</div>
							)}

							<CardContent className="space-y-6">
								<form onSubmit={handleSubmit} className="space-y-5">
									<div className="space-y-2">
										<Label htmlFor="username" className="text-sm font-semibold">Email or Username</Label>
										<div className="relative group">
											<User className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
											<Input
												id="username"
												name="username"
												type="text"
												autoComplete="username"
												required
												className="pl-10 h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
												placeholder="Enter your email or username"
												value={username}
												onChange={(e) => setUsername(e.target.value)}
												disabled={isFormDisabled}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="password" className="text-sm font-semibold">Password</Label>
										<div className="relative group">
											<Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
											<Input
												id="password"
												name="password"
												type="password"
												autoComplete="current-password"
												required
												className="pl-10 h-12 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
												placeholder="Enter your password"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												disabled={isFormDisabled}
											/>
										</div>
									</div>

									<Button
										type="submit"
										className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
										disabled={isFormDisabled}
									>
										{isLoading ? (
											<>
												<Loader2 className="mr-2 h-5 w-5 animate-spin" />
												Signing in...
											</>
										) : (
											"Sign in"
										)}
									</Button>
								</form>

								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<span className="w-full border-t border-gray-200" />
									</div>
									<div className="relative flex justify-center text-xs uppercase">
										<span className="bg-white px-3 text-gray-500 font-medium">
											Or continue with
										</span>
									</div>
								</div>

								<Button
									type="button"
									variant="outline"
									className="w-full h-12 border-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-semibold"
									onClick={() => signIn("google", { callbackUrl: "/my-learning" })}
									disabled={isFormDisabled}
								>
									<FcGoogle className="mr-2 h-5 w-5" />
									Sign in with Google
								</Button>
							</CardContent>

							<CardFooter className="flex flex-col space-y-3 pb-6">
								<div className="text-sm text-center text-gray-600">
									Don&apos;t have an account?{" "}
									<Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline transition-colors">
										Sign up
									</Link>
								</div>
							</CardFooter>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
