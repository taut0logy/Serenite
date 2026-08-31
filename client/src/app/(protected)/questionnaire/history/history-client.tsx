"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentHistoryEntry } from "@/actions/assessment.actions";

const SEVERITY_STYLE: Record<string, string> = {
    MINIMAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    MILD: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    MODERATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    SEVERE: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const SEVERITY_LABEL: Record<string, string> = {
    MINIMAL: "Minimal",
    MILD: "Mild",
    MODERATE: "Moderate",
    SEVERE: "Severe",
};

interface AssessmentHistoryClientProps {
    assessments: AssessmentHistoryEntry[];
}

export function AssessmentHistoryClient({ assessments }: AssessmentHistoryClientProps) {
    const router = useRouter();

    return (
        <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="-ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>

            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Check-in History</h1>
                <p className="text-muted-foreground">Your past assessments, most recent first.</p>
            </div>

            {assessments.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <ClipboardList className="w-8 h-8 text-primary/60" />
                        </div>
                        <p className="text-muted-foreground">No completed assessments yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {assessments.map((assessment) => (
                        <Card key={assessment.id} className="border-border/50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <span className="text-sm text-foreground">
                                    {(assessment.completedAt ?? assessment.createdAt).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </span>
                                <Badge className={cn("text-xs font-medium", SEVERITY_STYLE[assessment.overallSeverity])}>
                                    {SEVERITY_LABEL[assessment.overallSeverity] ?? assessment.overallSeverity}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
