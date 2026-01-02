import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { UserRole } from "./generated/prisma";

// First, handle public routes that don't need auth checks
export async function proxy(req: NextRequest) {
	const path = req.nextUrl.pathname;

	// Define public routes that don't need auth
	// NOTE: /api/seed is now protected at the route level with API key check
	const publicRoutes = [
		"/",
		"/register",
		"/api/auth/register",
		"/api/subscriptions/webhook",
	];

	// In development, allow /api/seed for easier testing
	if (process.env.NODE_ENV !== "production") {
		publicRoutes.push("/api/seed");
	}

	const isPublicRoute = publicRoutes.some(
		(route) => path === route || path.startsWith(route)
	);

	// Skip auth check for public routes
	if (isPublicRoute) {
		return NextResponse.next();
	}

	// Skip auth check for API auth routes to prevent loops
	if (path.startsWith("/api/auth")) {
		return NextResponse.next();
	}

	// Get the token using next-auth/jwt
	const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

	// Handle authentication logic
	const isAuthRoute = path === "/login";
	const isAppRoute = path.startsWith("/app");
	const isAdminRoute = path.startsWith("/admin");

	// If user is on login page but already authenticated, redirect based on role
	if (isAuthRoute && token) {
		if (token.role === UserRole.admin) {
			return NextResponse.redirect(new URL("/admin", req.url));
		} else {
			return NextResponse.redirect(new URL("/app/chat", req.url));
		}
	}

	// If user is trying to access protected routes without auth, redirect to login
	if (isAppRoute && !token) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	// SECURITY FIX: Admin routes require authentication
	if (isAdminRoute && !token) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	// Admin routes protection - ensure user is admin
	if (isAdminRoute && token && token.role !== UserRole.admin) {
		return NextResponse.redirect(new URL("/app", req.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/app/:path*",
		"/admin/:path*",
		"/login",
		"/register",
		"/api/:path*",
	],
};
