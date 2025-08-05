'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import FeedbackDashboard from '@/components/FeedbackDashboard';

export default function FeedbackPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Simple authentication check (in a real app, you'd use proper authentication)
  useEffect(() => {
    // Check for admin access - this is just a simple demo
    // In a real app, you would use NextAuth.js or another auth solution
    const checkAdminAccess = () => {
      const isAdmin = localStorage.getItem('admin_access') === 'true';
      setIsAdmin(isAdmin);
      
      // For demo purposes only - in a real app, never do this
      if (!isAdmin) {
        const password = prompt('Enter admin password to access feedback dashboard:');
        if (password === 'admin123') {  // Very insecure - for demo only!
          localStorage.setItem('admin_access', 'true');
          setIsAdmin(true);
        }
      }
    };
    
    checkAdminAccess();
  }, []);
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="mb-6">You need administrative access to view this page.</p>
        <Link href="/mental-health-assistant">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Mental Health Assistant
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <header className="bg-background border-b py-4 px-4 mb-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/mental-health-assistant">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Mental Health Assistant Feedback</h1>
            </div>
          </div>
        </div>
      </header>
      
      <FeedbackDashboard />
    </div>
  );
} 