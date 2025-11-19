"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Lock, User, AlertCircle } from "lucide-react";
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

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			// Use callbackUrl to ensure proper redirect after login
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

			// Wait a moment for session to be available, then get user session to determine role-based redirect
			await new Promise((resolve) => setTimeout(resolve, 100));
			const sessionResponse = await fetch("/api/auth/session");
			const session = await sessionResponse.json();

			// Redirect based on user role
			if (session?.user?.role === "admin") {
				router.replace("/admin");
			} else {
				router.replace("/app");
			}
		} catch (err) {
			console.error("Login error:", err);
			setError("An error occurred. Please try again.");
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8">
			<div className="w-full max-w-md space-y-6">
				<Card className="border-none shadow-lg">
					<CardHeader className="space-y-1">
						<CardTitle className="text-2xl font-semibold text-center">
							Smart Docs
						</CardTitle>
						<CardDescription className="text-center">
							Sign in to your account
						</CardDescription>
					</CardHeader>

					{error && (
						<div className="mx-6 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive">
							<AlertCircle className="h-4 w-4" />
							<p className="text-sm">{error}</p>
						</div>
					)}

					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="username">Email or Username</Label>
								<div className="relative">
									<User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="username"
										name="username"
										type="text"
										autoComplete="username"
										required
										className="pl-10"
										placeholder="Enter your email or username"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="password">Password</Label>
								</div>
								<div className="relative">
									<Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										required
										className="pl-10"
										placeholder="Enter your password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							</div>

							<div className="flex items-center space-x-2">
								<input
									id="remember"
									name="remember"
									type="checkbox"
									className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
									disabled={isLoading}
								/>
								<Label
									htmlFor="remember"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Remember me
								</Label>
							</div>

							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Signing in...
									</>
								) : (
									"Sign in"
								)}
							</Button>
						</form>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-background px-2 text-muted-foreground">
									Or continue with
								</span>
							</div>
						</div>

						<Button
							type="button"
							variant="outline"
							className="w-full"
							onClick={() => signIn("google", { callbackUrl: "/app" })}
							disabled={isLoading}
						>
							<FcGoogle className="mr-2 h-4 w-4" />
							Sign in with Google
						</Button>
					</CardContent>
					<CardFooter className="flex flex-col space-y-2">
						<div className="text-sm text-center text-muted-foreground">
							Don&apos;t have an account?{" "}
							<Link href="/register" className="text-primary hover:underline">
								Sign up
							</Link>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
