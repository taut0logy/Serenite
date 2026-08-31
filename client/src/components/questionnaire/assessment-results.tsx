"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentComparison } from "@/actions/assessment.actions";

const TREND_DISPLAY = {
    improved: { icon: TrendingDown, label: "Improved", className: "text-emerald-600 dark:text-emerald-400" },
    worsened: { icon: TrendingUp, label: "Worsened", className: "text-amber-600 dark:text-amber-400" },
    stable: { icon: Minus, label: "Stable", className: "text-muted-foreground" },
} as const;

interface AssessmentResultsProps {
    comparison: AssessmentComparison[];
    onContinue: () => void;
}

export function AssessmentResults({ comparison, onContinue }: AssessmentResultsProps) {
    return (
        <div className="max-w-2xl mx-auto p-6 min-h-[calc(100vh-65px)] flex flex-col justify-center">
            <Card className="shadow-xl border-2 border-border/50">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold text-foreground">
                        Compared to last time
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Since your last check-in
                    </p>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    <div className="space-y-2">
                        {comparison.map(({ domain, label, trend }) => {
                            const display = TREND_DISPLAY[trend];
                            const Icon = display.icon;
                            return (
                                <div
                                    key={domain}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                                >
                                    <span className="font-medium text-foreground">{label}</span>
                                    <span className={cn("flex items-center gap-1.5 text-sm font-medium", display.className)}>
                                        <Icon className="w-4 h-4" />
                                        {display.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        &quot;Improved&quot; and &quot;worsened&quot; only show for a meaningful change -
                        small week-to-week shifts are normal and shown as stable.
                    </p>

                    <Button onClick={onContinue} size="lg" className="w-full h-12">
                        Continue to Dashboard
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
