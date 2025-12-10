"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

// Import UserRole directly from Prisma

interface RoleGuardProps {
	/** The content to render if the user is authorized */
	children: React.ReactNode;
	/** The minimum role required to access the content */
	requiredRole: "admin" | "institution";
	/** Whether to allow admin access (admins bypass role checks) */
	allowAdmin?: boolean;
	/** Where to redirect if the user is not authorized */
	redirectTo?: string;
	/** Custom unauthorized content to render instead of redirecting */
	unauthorizedContent?: React.ReactNode;
	/** Whether to show loading state */
	showLoading?: boolean;
}

/**
 * A component that renders its children only if the user has the required role.
 * If not, it will either redirect to the login page or show an unauthorized message.
 */
const RoleGuard = ({
	children,
	requiredRole,
	allowAdmin = true,
	redirectTo = "/unauthorized",
	unauthorizedContent,
	showLoading = true,
}: RoleGuardProps) => {
	const { data: session, status } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isChecking, setIsChecking] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const checkAccess = useCallback(async () => {
		if (status === "loading") return;

		try {
			setIsChecking(true);
			setError(null);

			// If user is not authenticated, redirect to login
			if (status === "unauthenticated" || !session?.user) {
				const callbackUrl = encodeURIComponent(`${pathname}?${searchParams}`);
				router.push(`/login?callbackUrl=${callbackUrl}`);
				return;
			}

			// Get user role from session
			const userRole = session?.user?.role;

			// If no role found, deny access
			if (!userRole) {
				console.warn("User role not found in session");
				if (redirectTo) {
					router.push(redirectTo);
					return;
				} else {
					setError("User role not found. Please try logging in again.");
					return;
				}
			}

			// Check if user has the required role or is admin (if allowed)
			const hasAccess =
				(allowAdmin && userRole === "admin") ||
				(requiredRole === "institution" &&
					(userRole === "institution" || userRole === "admin")) ||
				(requiredRole === "admin" && userRole === "admin");

			if (!hasAccess) {
				const errorMsg = `You don't have permission to access this page. Required role: ${requiredRole}`;

				if (redirectTo) {
					router.push(redirectTo);
				} else {
					setError(errorMsg);
				}
			}
		} catch (err) {
			console.error("Error checking access:", err);
			setError("An error occurred while checking your permissions.");
		} finally {
			setIsChecking(false);
		}
	}, [
		status,
		session,
		requiredRole,
		allowAdmin,
		redirectTo,
		router,
		pathname,
		searchParams,
	]);

	useEffect(() => {
		checkAccess();
	}, [checkAccess]);

	// Show loading state
	if (isChecking && showLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8">
				<div
					className="relative
          h-12 w-12
          flex items-center justify-center
          rounded-full
          bg-primary/10
          text-primary
          animate-pulse
        "
				>
					<Loader2 className="h-6 w-6 animate-spin" />
				</div>
				<p className="text-sm text-muted-foreground">
					Verifying permissions...
				</p>
			</div>
		);
	}

	// Show error message if there was an error and we're not redirecting
	if (error && !redirectTo) {
		return (
			<div className="container mx-auto p-6 max-w-2xl">
				<div className="border border-destructive/20 bg-destructive/5 rounded-lg overflow-hidden">
					<div className="p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 h-5 w-5 text-destructive">
								<AlertCircle className="h-5 w-5" />
							</div>
							<div className="space-y-1.5">
								<h3 className="text-lg font-medium text-foreground">
									Access Denied
								</h3>
								<p className="text-sm text-muted-foreground">{error}</p>
							</div>
						</div>
						<div className="flex justify-end pt-2">
							<button
								onClick={() => window.history.back()}
								className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 border border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
							>
								Go Back
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Show custom unauthorized content if provided
	if (error && unauthorizedContent) {
		return <>{unauthorizedContent}</>;
	}

	// If we get here, the user is authorized
	return <>{children}</>;
};

export default RoleGuard;
