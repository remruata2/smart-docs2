"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Lock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

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

			// Successful login - redirect to admin dashboard
			router.replace("/admin");
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
						<CardTitle className="text-2xl font-semibold text-center">ICPS AI Database</CardTitle>
						<CardDescription className="text-center">Sign in to access the ICPS AI Database system</CardDescription>
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
								<Label htmlFor="username">Username</Label>
								<div className="relative">
									<User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input 
										id="username"
										name="username"
										type="text"
										autoComplete="username"
										required
										className="pl-10"
										placeholder="Enter your username"
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
								<Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Remember me</Label>
							</div>
							
							<Button 
								type="submit" 
								className="w-full" 
								disabled={isLoading}
							>
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
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
