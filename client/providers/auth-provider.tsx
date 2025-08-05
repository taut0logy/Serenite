"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from '@/auth';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  hasPermission: (requiredRole?: string) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Extract user from session
  const user = session?.user as User | null;

  //console.log("[Auth provider]: user---", user);
  
  const isAuthenticated = !!user;
  const isVerified = !!user?.email_verified;
  
  // Check if user has a specific role
  const hasPermission = (requiredRole?: string) => {
    if (!requiredRole) return isAuthenticated;
    if (!user) return false;
    
    const userRole = user.role || 'USER';
    
    // Define role hierarchy for permission checking
    const roleHierarchy: Record<string, number> = {
      'USER': 1,
      'HOST': 2,
      'MANAGER': 3,
      'ADMIN': 4
    };
    
    // Check if user's role has enough privileges for the required role
    return roleHierarchy[userRole] >= (roleHierarchy[requiredRole] || 0);
  };
  
  // Handle logout with redirect
  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };
  
  // Effect to handle loading state
  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status]);
  
  const value = {
    user,
    isLoading,
    isAuthenticated,
    isVerified,
    hasPermission,
    logout
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext; 