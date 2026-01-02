"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail, User, AlertCircle } from "lucide-react";
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

export default function RegisterPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			// Register user
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					password,
					name: name || undefined,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || "Registration failed");
				setIsLoading(false);
				return;
			}

			// Auto-login after successful registration
			const result = await signIn("credentials", {
				redirect: false,
				username: email, // Use email for login
				password,
			});

			if (result?.error) {
				setError("Registration successful but login failed. Please try logging in.");
				setIsLoading(false);
				return;
			}

			// Redirect to catalog (new users have no enrollments yet)
			router.replace("/");
		} catch (err) {
			console.error("Registration error:", err);
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
							Create Account
						</CardTitle>
						<CardDescription className="text-center">
							Sign up to start using Zirna
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
								<Label htmlFor="name">Full Name (Optional)</Label>
								<div className="relative">
									<User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="name"
										name="name"
										type="text"
										autoComplete="name"
										className="pl-10"
										placeholder="Enter your name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										required
										className="pl-10"
										placeholder="Enter your email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
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
										autoComplete="new-password"
										required
										minLength={8}
										className="pl-10"
										placeholder="Enter your password (min 8 characters)"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										disabled={isLoading}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Password must be at least 8 characters long
								</p>
							</div>

							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating account...
									</>
								) : (
									"Create Account"
								)}
							</Button>
						</form>
					</CardContent>

					<CardFooter className="flex flex-col space-y-4">
						<div className="text-sm text-center text-muted-foreground">
							Already have an account?{" "}
							<Link href="/login" className="text-primary hover:underline">
								Sign in
							</Link>
						</div>
						<div className="text-xs text-center text-muted-foreground">
							By creating an account, you agree to our Terms of Service and Privacy Policy
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}

