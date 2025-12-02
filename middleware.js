import { NextResponse } from 'next/server';

/**
 * Mobile User Agent Detection Pattern
 * 
 * This regex pattern detects various mobile and tablet devices:
 * - iPhones and iPads
 * - Android devices and tablets
 * - Mobile Chrome, Safari, Firefox
 * - Windows Phone, BlackBerry
 * - And other mobile browsers
 */
const mobileUserAgentPattern = /Mobile|Android|iPad|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|webOS|Windows Phone/i;

/**
 * Middleware function that blocks mobile access
 * 
 * This middleware runs on the server-side for every request and:
 * 1. Checks the user-agent header to detect mobile devices
 * 2. Redirects mobile users to /mobile-not-supported
 * 3. Allows desktop users and the /mobile-not-supported page itself
 * 
 * Works on both Vercel and local development environments.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow the mobile-not-supported page to be accessed without redirect
  if (pathname === '/mobile-not-supported') {
    return NextResponse.next();
  }

  // Get the user-agent header from the request
  const userAgent = request.headers.get('user-agent') || '';

  // Check if the user-agent matches any mobile device pattern
  const isMobile = mobileUserAgentPattern.test(userAgent);

  // If the request is from a mobile device, redirect to the mobile-not-supported page
  if (isMobile) {
    return NextResponse.redirect(new URL('/mobile-not-supported', request.url));
  }

  // Allow desktop users to continue to their requested page
  return NextResponse.next();
}

/**
 * Matcher configuration
 * 
 * This defines which routes the middleware applies to.
 * - '*': Matches all routes
 * - '/((?!api|_next/static|_next/image|favicon.ico).*)': Excludes API routes and Next.js internal routes
 * 
 * We use a broad matcher to protect all user-facing pages, while excluding:
 * - API routes (/api/*)
 * - Next.js static files (/_next/static/*)
 * - Next.js image optimization (/_next/image/*)
 * - Favicon requests
 */
export const config = {
  matcher: [
    // Protect all pages except API and Next.js internals
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
