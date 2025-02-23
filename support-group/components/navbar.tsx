"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/login-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  return (
    <nav className="w-full border-b bg-background/50 backdrop-blur-md fixed top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-xl">
          MindfulSupport
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link href="/about" className="text-sm hover:text-primary">
            About
          </Link>
          <Link href="/services" className="text-sm hover:text-primary">
            Services
          </Link>
          <Link href="/blog" className="text-sm hover:text-primary">
            Blog
          </Link>
          <Link href="/contact" className="text-sm hover:text-primary">
            Contact
          </Link>
          <ThemeToggle />
          <LoginButton>
            <Button variant="default" size="sm">
              Sign in
            </Button>
          </LoginButton>
        </div>
      </div>
    </nav>
  );
} 