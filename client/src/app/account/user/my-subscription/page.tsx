"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Update this import
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check,
    X,
    HelpCircle,
    Sparkles,
    Shield,
    Zap,
    Clock,
    Users,
    Crown,
} from "lucide-react";

interface SubscriptionPlan {
    id: string;
    title: string;
    priceMonthly: number;
    priceYearly: number;
    features: Array<{
        text: string;
        included: boolean;
        tooltip?: string;
    }>;
    badge?: string;
    isPopular?: boolean;
}

const plans: SubscriptionPlan[] = [
    {
        id: "basic",
        title: "Basic",
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            { text: "Up to 5 active group memberships", included: true },
            { text: "Standard response time", included: true },
            { text: "Basic community features", included: true },
            { text: "Priority support", included: false },
            {
                text: "Unlimited group access",
                included: false,
                tooltip: "Join as many groups as you want",
            },
            { text: "Monthly wellness reports", included: false },
        ],
        badge: "Good for Beginners",
    },
    {
        id: "premium",
        title: "Premium",
        priceMonthly: 19.99,
        priceYearly: 199,
        features: [
            { text: "Unlimited group memberships", included: true },
            { text: "Priority support 24/7", included: true },
            { text: "Advanced community features", included: true },
            { text: "Exclusive content access", included: true },
            {
                text: "Monthly wellness reports",
                included: true,
                tooltip: "Detailed insights about your progress",
            },
            { text: "Early access to new features", included: true },
        ],
        badge: "Most Popular",
        isPopular: true,
    },
];

export default function Subscription() {
    const [isYearly, setIsYearly] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const router = useRouter(); // No change needed here

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f0f4ff] to-[#f9fafb] dark:from-[#1e1b4b] dark:to-[#171923]">
            <div className="container mx-auto py-12 px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-['Space_Grotesk'] tracking-tight text-gray-900 dark:text-white mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-muted-foreground font-['Inter'] max-w-2xl mx-auto">
                        Select the perfect plan for your journey of growth and
                        connection
                    </p>

                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span
                            className={`text-sm ${
                                !isYearly
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-muted-foreground"
                            }`}
                        >
                            Monthly
                        </span>
                        <Switch
                            checked={isYearly}
                            onCheckedChange={setIsYearly}
                            className="data-[state=checked]:bg-blue-600"
                        />
                        <span
                            className={`text-sm ${
                                isYearly
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-muted-foreground"
                            }`}
                        >
                            Yearly
                            <Badge
                                variant="secondary"
                                className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                            >
                                Save 20%
                            </Badge>
                        </span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <AnimatePresence>
                        {plans.map((plan) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                whileHover={{ scale: 1.02 }}
                            >
                                <Card
                                    className={`relative backdrop-blur-sm bg-white/90 dark:bg-black/20 border-none shadow-lg hover:shadow-xl transition-all duration-300 
                  ${
                      plan.isPopular
                          ? "ring-2 ring-blue-500 dark:ring-blue-400"
                          : ""
                  }`}
                                >
                                    {plan.isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-1">
                                                <Crown className="w-4 h-4 mr-1 inline-block" />{" "}
                                                Most Popular
                                            </Badge>
                                        </div>
                                    )}

                                    <CardHeader className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold font-['Space_Grotesk']">
                                                    {plan.title}
                                                </h3>
                                                {plan.badge && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="mt-2"
                                                    >
                                                        {plan.badge}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold">
                                                    $
                                                    {isYearly
                                                        ? plan.priceYearly
                                                        : plan.priceMonthly}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    per{" "}
                                                    {isYearly
                                                        ? "year"
                                                        : "month"}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 border-t border-gray-100 dark:border-gray-800">
                                        <ul className="space-y-4">
                                            {plan.features.map(
                                                (feature, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start gap-3"
                                                    >
                                                        {feature.included ? (
                                                            <Check className="w-5 h-5 text-green-500 mt-0.5" />
                                                        ) : (
                                                            <X className="w-5 h-5 text-gray-300 mt-0.5" />
                                                        )}
                                                        <span className="flex-1">
                                                            {feature.text}
                                                        </span>
                                                        {feature.tooltip && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            {
                                                                                feature.tooltip
                                                                            }
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </CardContent>

                                    <CardFooter className="p-6 border-t border-gray-100 dark:border-gray-800">
                                        <Button
                                            className={`w-full ${
                                                plan.isPopular
                                                    ? "bg-blue-600 hover:bg-blue-700"
                                                    : ""
                                            }`}
                                            variant={
                                                plan.isPopular
                                                    ? "default"
                                                    : "outline"
                                            }
                                            onClick={() => {
                                                setSelectedPlan(plan.id);
                                                router.push(
                                                    "/account/user/my-subscription/payment"
                                                ); // No change needed here
                                            }}
                                        >
                                            {plan.isPopular
                                                ? "Upgrade Now"
                                                : "Get Started"}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
