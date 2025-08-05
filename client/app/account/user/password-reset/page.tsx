'use client'; // Must be the first line

import { useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { buttonVariants } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Lock, Mail, Code } from 'lucide-react';
import Link from 'next/link';

export default function PasswordResetPage() {
  const [currentStep, setCurrentStep] = useState(1);

  // Define a helper function for step circle classes
  const getStepClass = (stepNumber: number) => {
    const isActive = currentStep === stepNumber;
    const isCompleted = currentStep > stepNumber;

    return cn(
      'w-8 h-8 rounded-full flex items-center justify-center border',
      isActive
        ? 'bg-blue-500 text-white border-blue-500 dark:bg-blue-700 dark:border-blue-700' // Active step background and text color
        : isCompleted
          ? 'bg-green-400 text-gray-800 border-green-400 dark:bg-green-600 dark:border-green-600' // Completed step background and text color
          : 'bg-gray-200 text-gray-500 border-gray-200 dark:bg-gray-600 dark:border-gray-600' // Inactive step background and text color
    );
  };

  // Define a helper function for connector classes
  const getConnectorClass = (stepNumber: number) => {
    const isActive = currentStep > stepNumber;

    return cn(
      'flex-1 h-1',
      isActive
        ? 'bg-blue-500 dark:bg-blue-700' // Connector for completed steps
        : 'bg-gray-300 dark:bg-gray-700' // Connector for incomplete steps
    );
  };

  return (
    <PageContainer>
      <div className="max-w-md mx-auto mt-10 p-6 border rounded-md shadow-md bg-white dark:bg-gray-800">
        <Heading
          title="Reset Your Password"
          description="Follow the steps below to reset your password."
        />
        <Separator className="mb-6" />

        {/* Step Indicators */}
        <div className="flex items-center mb-6">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className={getStepClass(1)}>
              1
            </div>
            <span className="text-xs mt-2 text-gray-700 dark:text-gray-300">Email</span>
          </div>
          {/* Connector */}
          <div className={getConnectorClass(1)}></div>
          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className={getStepClass(2)}>
              2
            </div>
            <span className="text-xs mt-2 text-gray-700 dark:text-gray-300">Verification</span>
          </div>
          {/* Connector */}
          <div className={getConnectorClass(2)}></div>
          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className={getStepClass(3)}>
              3
            </div>
            <span className="text-xs mt-2 text-gray-700 dark:text-gray-300">Reset</span>
          </div>
        </div>

        {/* Step 1: Enter Email */}
        {currentStep === 1 && (
          <form>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  id="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-700"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={cn(buttonVariants(), 'w-full')}
            >
              Next
            </button>
          </form>
        )}

        {/* Step 2: Enter Verification Code */}
        {currentStep === 2 && (
          <form>
            <div className="mb-6">
              <label htmlFor="verification-code" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Verification Code
              </label>
              <div className="relative">
                <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  id="verification-code"
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-700"
                  placeholder="Enter verification code"
                />
              </div>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={cn(buttonVariants({ variant: 'ghost' }), 'w-1/2 mr-2')}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={cn(buttonVariants(), 'w-1/2 ml-2')}
              >
                Next
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {currentStep === 3 && (
          <form>
            <div className="mb-4">
              <label htmlFor="new-password" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  id="new-password"
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-700"
                  placeholder="Enter new password"
                />
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  id="confirm-password"
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-700"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={cn(buttonVariants({ variant: 'ghost' }), 'w-1/2 mr-2')}
              >
                Back
              </button>
              <button
                type="submit"
                className={cn(buttonVariants(), 'w-1/2 ml-2')}
              >
                Reset Password
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link href="/user/dashboard/overview" className="text-sm text-blue-500 dark:text-blue-700 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
