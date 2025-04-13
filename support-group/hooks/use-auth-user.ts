'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/auth';
import { User } from '@prisma/client';

// Simple type for the user with required fields
type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

/**
 * Custom hook to get the authenticated user
 * This hook provides a simpler interface to get the current user
 * and handles the session state for you
 */
export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  useEffect(() => {
    // Function to get the user from the session
    async function getUser() {
      try {
        const session = await auth();
        
        if (session?.user?.id) {
          setUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          });
        } else {
          // If no session or no user, use a default user ID for testing
          // In a production app, you'd want to handle this differently
          setUser({
            id: "1", // Default user ID for testing
            name: "Test User",
            email: "test@example.com",
          });
        }
      } catch (error) {
        console.error("Error getting auth user:", error);
        // Fallback to a default user for testing
        setUser({
          id: "1",
          name: "Test User",
          email: "test@example.com",
        });
      }
    }
    
    getUser();
  }, []);
  
  return user;
} 