import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from './generated/prisma';

// First, handle public routes that don't need auth checks
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Define public routes that don't need auth
  const publicRoutes = ['/api/seed'];
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
  
  // Skip auth check for public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Skip auth check for API auth routes to prevent loops
  if (path.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  
  // Get the token using next-auth/jwt
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Handle authentication logic
  const isAuthRoute = path === '/login';
  const isDashboardRoute = path.startsWith('/dashboard');
  const isAdminRoute = path.startsWith('/admin');
  
  // If user is on login page but already authenticated, redirect to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // If user is trying to access protected routes without auth, redirect to login
  if (isDashboardRoute && !token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Redirect dashboard routes to admin routes
  if (isDashboardRoute && !req.headers.get('x-middleware-rewrite')) {
    // Redirect /dashboard to /admin
    if (path === '/dashboard') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    // Redirect other dashboard paths to admin
    if (path.startsWith('/dashboard/')) {
      const newPath = path.replace('/dashboard', '/admin');
      return NextResponse.redirect(new URL(newPath, req.url));
    }
  }

  // Admin routes protection
  if ((isDashboardRoute || isAdminRoute) && token) {
    if (isAdminRoute && token.role !== UserRole.admin) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/api/:path*'
  ],
};
