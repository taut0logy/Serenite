'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * Layout for public routes
 * All routes under this layout will be publicly accessible
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  // Authenticating but not requiring or restricting access
  const { isLoading } = useAuth();

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Render children regardless of authentication status
  return <>{children}</>;
} 