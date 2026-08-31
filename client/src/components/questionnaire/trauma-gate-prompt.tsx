"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { TRAUMA_EXPOSURE_GATE } from "@/lib/assessment/banks";

interface TraumaGatePromptProps {
    onAnswer: (exposed: boolean) => void;
}

export function TraumaGatePrompt({ onAnswer }: TraumaGatePromptProps) {
    return (
        <div className="max-w-2xl mx-auto p-6 min-h-[calc(100vh-65px)] flex flex-col justify-center">
            <Card className="shadow-xl border-2 border-border/50">
                <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                        One question before this section
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    <p className="text-sm text-muted-foreground text-center">
                        The next few questions ask about difficult or traumatic experiences.
                        You can skip this section entirely if it does not apply to you.
                    </p>
                    <p className="text-lg font-medium text-foreground text-center">
                        {TRAUMA_EXPOSURE_GATE}
                    </p>
                    <div className="flex gap-4">
                        <Button variant="outline" size="lg" className="flex-1 h-12" onClick={() => onAnswer(false)}>
                            No
                        </Button>
                        <Button size="lg" className="flex-1 h-12" onClick={() => onAnswer(true)}>
                            Yes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
