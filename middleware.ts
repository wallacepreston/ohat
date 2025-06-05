import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './lib/auth';

// List of public routes that don't require authentication
const publicRoutes = [
  "/",
  "/api-docs",
  "/login",
  "/sign-up",
  "/verify",
  "/debug"
];

// Routes that can always be accessed without authentication checks
const ignoredRoutes = [
  "/api/webhook",
  "/api/process-sqs", // we check auth explicitly in the process-sqs route
  "/api/email/inbound", // sendgrid inbound parse doesn't support auth
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  ".*\\.svg"
];

export async function middleware(request: NextRequest) {
  // Extract the pathname from the URL
  const { pathname } = request.nextUrl;
  
  // Check if this path should be ignored completely
  if (ignoredRoutes.some(route => {
    if (route.includes('*')) {
      const regex = new RegExp(route);
      return regex.test(pathname);
    }
    return pathname.startsWith(route);
  })) {
    // For ignored routes, skip auth check entirely
    return NextResponse.next();
  }
  
  // Check if this is a public route
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }
  
  // For protected routes, verify authentication
  const authResult = await verifyAuth(request);
  console.log("authResult", authResult);
  
  if (!authResult.authorized) {
    // if the route is an api route, return a 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log("Unauthorized, redirecting to login");
    console.log('authResult', authResult);
    // If unauthorized, redirect to login
    const url = new URL('/login', request.url);
    // Add the return URL as a query parameter
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // User is authorized, continue to the protected route
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
}; 