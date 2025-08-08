"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    AlertTriangle,
    ExternalLink,
    Heart,
    Phone,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "@/lib/axios";

interface CrisisResource {
    name: string;
    description: string;
    contact: string;
}

interface Organization {
    name: string;
    description: string;
    website: string;
}

interface ResourcesData {
    crisis_resources: CrisisResource[];
    organizations: Organization[];
}

export default function MentalHealthResources() {
    const [resources, setResources] = useState<ResourcesData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/chat/resources");

                if (response.status !== 200) {
                    throw new Error("Failed to fetch resources");
                }

                setResources(response.data);
            } catch (err) {
                console.error("Error fetching resources:", err);
                setError(
                    err instanceof Error ? err.message : "An error occurred"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                        Loading resources...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
                <Card className="max-w-md w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <CardTitle className="text-xl font-medium text-slate-900 dark:text-slate-100">
                            Error Loading Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-red-700 dark:text-red-400">
                            {error}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                            Please try again later or contact support.
                        </p>
                        <Link href="/mental-health-assistant">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Assistant
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <Link
                        href="/mental-health-assistant"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Assistant
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        Mental Health Resources
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Find support, organizations, and self-care tips to help
                        you on your mental health journey
                    </p>
                </div>

                {resources && (
                    <div className="space-y-8">
                        {/* Crisis Resources */}
                        <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <CardHeader className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800/30">
                                <CardTitle className="flex items-center gap-3 text-red-800 dark:text-red-400">
                                    <Phone className="h-5 w-5" />
                                    Crisis Resources
                                </CardTitle>
                                <p className="text-red-700 dark:text-red-300 text-sm">
                                    If you&apos;re in crisis, please reach out
                                    immediately
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="space-y-0">
                                    {resources.crisis_resources.map(
                                        (resource, index) => (
                                            <div
                                                key={index}
                                                className="p-4 border-b border-red-100 dark:border-red-800/20 last:border-b-0"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                                                            {resource.name}
                                                        </h4>
                                                        <p className="text-slate-600 dark:text-slate-400">
                                                            {
                                                                resource.description
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <Badge
                                                            variant="destructive"
                                                            className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                                                        >
                                                            {resource.contact}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Organizations */}
                        <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
                                    <Globe className="h-5 w-5" />
                                    Mental Health Organizations
                                </CardTitle>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    Professional organizations and support
                                    networks
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="space-y-0">
                                    {resources.organizations.map(
                                        (org, index) => (
                                            <div
                                                key={index}
                                                className="p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                                                            {org.name}
                                                        </h4>
                                                        <p className="text-slate-600 dark:text-slate-400">
                                                            {org.description}
                                                        </p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <Button
                                                            asChild
                                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                                        >
                                                            <a
                                                                href={
                                                                    org.website
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                Visit Website
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Self-care Resources */}
                        <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <CardHeader className="bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800/30">
                                <CardTitle className="flex items-center gap-3 text-green-800 dark:text-green-400">
                                    <Heart className="h-5 w-5" />
                                    Self-Care Tips
                                </CardTitle>
                                <p className="text-green-700 dark:text-green-300 text-sm">
                                    Daily practices to support your mental
                                    well-being
                                </p>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid gap-3">
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Practice deep breathing and
                                            meditation
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Maintain a regular sleep schedule
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Stay physically active with regular
                                            exercise
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Eat a balanced diet and stay
                                            hydrated
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Connect with supportive friends and
                                            family
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Engage in activities that bring you
                                            joy and relaxation
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Set boundaries and practice saying
                                            no when needed
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Take breaks from news and social
                                            media
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 mt-2 flex-shrink-0"></div>
                                        <span>
                                            Seek professional help when needed
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
