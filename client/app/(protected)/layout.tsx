'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';
import StreamVideoProvider from '@/providers/stream-video-provider';

interface ProtectedLayoutProps {
  children: ReactNode;
}

/**
 * Layout for protected routes
 * All child routes will require authentication
 */
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  // Use auth hook to manage authentication state
  const { isLoading } = useAuth({
    required: true,
    redirectTo: '/auth/login',
  });

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Render children only for authenticated users
  // (redirect to login is handled by the useAuth hook)
  return <div className='mx-auto'>
    <StreamVideoProvider>
    {children}
    </StreamVideoProvider>
    </div>;
}
