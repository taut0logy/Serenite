'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface VerifiedLayoutProps {
  children: ReactNode;
}

/**
 * Layout for routes that require both authentication and email verification
 * All child routes will require authentication and email verification
 */
export default function VerifiedLayout({ children }: VerifiedLayoutProps) {
  // Use auth hook to manage authentication and verification state
  const { isLoading, isAuthenticated, isVerified } = useAuth({
    required: true,
    verifiedRequired: true,
    redirectTo: '/auth/login',
  });

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Children will only be rendered if user is authenticated and verified
  // (redirects are handled by the useAuth hook)
  return <>{children}</>;
} 