"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartHandshake, Phone } from "lucide-react";

interface Resource {
    name: string;
    number: string;
    hours: string;
}

// Verified against each provider's own page, 2026-08-28. Re-check before any
// production launch - these change, and a stale number here is worse than none.
const RESOURCES: Resource[] = [
    {
        name: "Kaan Pete Roi",
        number: "09612-119911",
        hours: "Every day, 3:00 PM - 3:00 AM",
    },
    {
        name: "DGHS Health Call Centre",
        number: "16263",
        hours: "24/7",
    },
    {
        name: "National Emergency Service",
        number: "999",
        hours: "24/7 - immediate danger",
    },
];

interface CrisisPanelProps {
    onAcknowledge: () => void;
}

export function CrisisPanel({ onAcknowledge }: CrisisPanelProps) {
    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="crisis-panel-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
        >
            <Card className="w-full max-w-lg shadow-xl border-2 border-primary/30">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <HeartHandshake className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle id="crisis-panel-title" className="text-xl font-semibold text-foreground">
                        You don&apos;t have to go through this alone
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    <p className="text-sm text-muted-foreground text-center">
                        Something in your last answer suggests you may be having thoughts of
                        harming yourself or not wanting to be here. That matters, and support
                        is available right now.
                    </p>

                    <div className="space-y-3">
                        {RESOURCES.map((resource) => (
                            <div
                                key={resource.name}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                            >
                                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-foreground">{resource.name}</div>
                                    <div className="text-xs text-muted-foreground">{resource.hours}</div>
                                </div>
                                <a
                                    href={`tel:${resource.number.replace(/[^0-9+]/g, "")}`}
                                    className="font-mono text-sm font-semibold text-primary whitespace-nowrap"
                                >
                                    {resource.number}
                                </a>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        If you are in immediate danger, please call 999 or go to your nearest
                        emergency room now.
                    </p>

                    <Button onClick={onAcknowledge} size="lg" className="w-full h-12">
                        I&apos;ve seen this - continue
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
