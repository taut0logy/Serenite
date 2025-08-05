'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Shield, Key, Bell, Layout } from 'lucide-react';

export default function SettingsPage() {
  const settingsCategories = [
    {
      title: 'Profile',
      description: 'Manage your personal information and public profile',
      icon: <User className="h-6 w-6" />,
      href: '/profile',
    },
    {
      title: 'Security',
      description: 'Two-factor authentication and security settings',
      icon: <Shield className="h-6 w-6" />,
      href: '/settings/security',
    },
    {
      title: 'Password',
      description: 'Update your password and manage account security',
      icon: <Key className="h-6 w-6" />,
      href: '/settings/password',
    },
    {
      title: 'Notifications',
      description: 'Configure how you receive notifications',
      icon: <Bell className="h-6 w-6" />,
      href: '/settings/notifications',
    },
    {
      title: 'Display',
      description: 'Customize the appearance of the application',
      icon: <Layout className="h-6 w-6" />,
      href: '/settings/display',
    },
  ];

  return (
    <div className="container py-10 px-4 mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((category) => (
          <Link key={category.title} href={category.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{category.title}</CardTitle>
                <div className="text-primary">{category.icon}</div>
              </CardHeader>
              <CardContent>
                <CardDescription>{category.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 