import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { CLAIM_OVERRIDE_COOKIE, decodeClaimOverride, resolveClaim, type ClaimOverridePayload } from '@/lib/claim-overrides';

const { auth } = NextAuth(authConfig);

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

/**
 * Apply standard HTTP security headers to every response.
 * Permissions-Policy allows camera/mic for video conferencing.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=()'
  );
  // HSTS — only in production (browsers ignore it over HTTP anyway)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  return response;
}

export default auth(async (req) => {
  const isAuthenticated = !!req.auth?.user;
  const user = req.auth?.user;

  // Takes precedence over the (possibly stale) JWT claims below — see lib/claim-overrides.ts
  let override: ClaimOverridePayload | null = null;
  const overrideToken = req.cookies.get(CLAIM_OVERRIDE_COOKIE)?.value;
  if (overrideToken && process.env.AUTH_SECRET) {
    override = await decodeClaimOverride(overrideToken, process.env.AUTH_SECRET);
  }

  const userId = user?.id ?? '';
  const isVerified = user
    ? resolveClaim('email_verified', user.email_verified === true, override, userId)
    : false;
  const hasPassword = user
    ? resolveClaim('hasPassword', user.hasPassword === true, override, userId)
    : false;
  const questionnaireCompleted = user
    ? resolveClaim('questionnaireCompleted', user.questionnaireCompleted === true, override, userId)
    : false;

  const path = req.nextUrl.pathname;
  const isApiRoute = path.startsWith('/api');

  // Debug logging — development only
  if (process.env.NODE_ENV === 'development' && isAuthenticated) {
    console.log('Middleware auth check:', {
      path,
      isAuthenticated,
      hasPassword,
      questionnaireCompleted,
      isVerified,
      isApiRoute,
      hadOverride: !!override,
    });
  }

  const isProtectedPath = PROTECTED_PATHS.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );
  const isAuthPath = AUTH_PATHS.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );
  const isVerifiedPath = VERIFIED_PATHS.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );

  let response: NextResponse | null = null;

  // CASE 1: Protected path + not logged in → login (Skip for API routes)
  if (isProtectedPath && !isAuthenticated && !isApiRoute) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('callbackUrl', req.url);
    response = NextResponse.redirect(redirectUrl);

  // CASE 2: Auth path + already logged in → dashboard
  } else if (isAuthPath && isAuthenticated) {
    response = NextResponse.redirect(new URL('/dashboard', req.url));

  // CASE 3 (KYC — uncomment when KYC rollout is ready):
  // } else if (isAuthenticated && !kycVerified && path !== '/auth/kyc-verification') {
  //   response = NextResponse.redirect(new URL('/auth/kyc-verification', req.url));

  // CASE 4: Logged in but no password set → force set-password (Skip for API routes)
  } else if (isAuthenticated && !hasPassword && path !== '/auth/set-password' && !isApiRoute) {
    response = NextResponse.redirect(new URL('/auth/set-password', req.url));

  // CASE 5: Has password + on set-password page → dashboard
  } else if (isAuthenticated && hasPassword && path === '/auth/set-password') {
    response = NextResponse.redirect(new URL('/dashboard', req.url));

  // CASE 8 (moved up): Requires verification + not verified → verify-request (Skip for API routes)
  } else if (isVerifiedPath && isAuthenticated && !isVerified && !isApiRoute) {
    response = NextResponse.redirect(new URL('/auth/verify-request', req.url));

  // CASE 6: Has password but questionnaire not done → questionnaire (Skip for API routes)
  } else if (isAuthenticated && hasPassword && !questionnaireCompleted && path !== '/questionnaire' && !isApiRoute) {
    const shouldRedirect = [
      '/dashboard', '/mental-health-assistant', '/breathing-exercise', '/diary',
    ].some(prefix => path === prefix || path.startsWith(`${prefix}/`));

    if (shouldRedirect) {
      response = NextResponse.redirect(new URL('/questionnaire', req.url));
    }

  // CASE 7 removed: /questionnaire used to unconditionally redirect away
  // once completed. Now that a completed user can legitimately need to
  // revisit it for re-assessment, the finer-grained check (completed AND
  // not due) needs a real DB read - done page-side in questionnaire/page.tsx
  // rather than here, since middleware only has cheap JWT claims to work with.
  }

  // Apply security headers to both redirects and pass-throughs
  const finalResponse = response ?? NextResponse.next();
  return addSecurityHeaders(finalResponse);
});

// Configure which paths this middleware is applied to
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /_next/static (static files)
     * 2. /_next/image (image optimization files)
     * 3. /favicon.ico, /robots.txt (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
};
