import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Paths that require authentication
const PROTECTED_PATHS = [
  '/auth/set-password',
  '/dashboard',
  '/meeting',
  '/profile',
  '/settings',
  '/mental-health-assistant',
  '/breathing-exercise',
  '/diary',
  '/questionnaire',
];

// Paths that are only accessible to guests (not logged in users)
const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
];

// Paths that need email verification
const VERIFIED_PATHS = [
  '/meetings/host',
  '/meetings/create',
  '/settings/billing',
];

export default auth((req) => {
  // Access token data from req.auth (provided by NextAuth middleware)
  const isAuthenticated = !!req.auth;
  const isVerified = req.auth?.user?.email_verified === true;
  //const kycVerified = req.auth?.user?.kycVerified === true;
  const hasPassword = req.auth?.user?.hasPassword === true;
  const questionnaireCompleted = req.auth?.user?.questionnaireCompleted === true;
  const path = req.nextUrl.pathname;

  // Check if the path is a protected route
  const isProtectedPath = PROTECTED_PATHS.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );

  // Check if the path is an auth route (login, register, etc.)
  const isAuthPath = AUTH_PATHS.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );

  // Check if the path requires verification
  const isVerifiedPath = VERIFIED_PATHS.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );

  // CASE 1: Protected path but user is not authenticated
  if (isProtectedPath && !isAuthenticated) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // CASE 2: Auth path but user is already authenticated
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // CASE 3: User is authenticated but KYC is not verified
  // if (isAuthenticated && !kycVerified && path !== '/auth/kyc-verification') {
  //   return NextResponse.redirect(new URL('/auth/kyc-verification', req.url));
  // }

  // CASE 4:User is verified but has no password set
  if (isAuthenticated && !hasPassword && path !== '/auth/set-password') {
    return NextResponse.redirect(new URL('/auth/set-password', req.url));
  }

  // CASE 5: User has password set and visits set-password page
  if (hasPassword && path === '/auth/set-password') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // CASE 6: User has password but questionnaire not completed, redirect to questionnaire
  // Only redirect to questionnaire from dashboard and other main app pages, not from questionnaire itself
  // if (isAuthenticated && hasPassword && !questionnaireCompleted && path !== '/questionnaire') {
  //   // Only redirect from main app pages, not from auth pages
  //   const shouldRedirectToQuestionnaire = ['/dashboard', '/profile', '/settings', '/mental-health-assistant', '/breathing-exercise', '/diary'].some(prefix =>
  //     path === prefix || path.startsWith(`${prefix}/`)
  //   );

  //   if (shouldRedirectToQuestionnaire) {
  //     return NextResponse.redirect(new URL('/questionnaire', req.url));
  //   }
  // }

  // CASE 7: Questionnaire completed but user tries to access questionnaire page
  if (questionnaireCompleted && path === '/questionnaire') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // CASE 8: Path requires verification but user is not verified
  if (isVerifiedPath && isAuthenticated && !isVerified) {
    return NextResponse.redirect(new URL('/auth/verify-request', req.url));
  }

  // Continue for all other cases
  return NextResponse.next();
})

// Configure which paths this middleware is applied to
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next/static (static files)
     * 3. /_next/image (image optimization files)
     * 4. /favicon.ico, /robots.txt (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}; 