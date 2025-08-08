"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";
import FeedbackDashboard from "@/components/FeedbackDashboard";

export default function FeedbackPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Simple authentication check (in a real app, you'd use proper authentication)
    useEffect(() => {
        // Check for admin access - this is just a simple demo
        // In a real app, you would use NextAuth.js or another auth solution
        const checkAdminAccess = () => {
            const isAdmin = localStorage.getItem("admin_access") === "true";
            setIsAdmin(isAdmin);

            // For demo purposes only - in a real app, never do this
            if (!isAdmin) {
                const password = prompt(
                    "Enter admin password to access feedback dashboard:"
                );
                if (password === "admin123") {
                    // Very insecure - for demo only!
                    localStorage.setItem("admin_access", "true");
                    setIsAdmin(true);
                }
            }
            setLoading(false);
        };

        checkAdminAccess();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                        Loading...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <div className="space-y-2">
                            <p className="text-slate-600 dark:text-slate-400">
                                You need administrative access to view this
                                page.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Administrator privileges required</span>
                            </div>
                        </div>
                        <Link href="/mental-health-assistant">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Return to Mental Health Assistant
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/mental-health-assistant">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                Mental Health Assistant Feedback
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Monitor and analyze user feedback
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <FeedbackDashboard />
            </div>
        </div>
    );
}
