"use client";

import { Button } from "@/components/ui/button";
import { Clock, Shield } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";

interface QuestionnaireIntroProps {
    onStart: () => void;
    hasSavedProgress?: boolean;
}

export function QuestionnaireIntro({
    onStart,
    hasSavedProgress = false,
}: QuestionnaireIntroProps) {
    return (
        <div className="max-w-2xl mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-bold text-foreground">
                    {questionnaire.intro.title}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    {questionnaire.intro.text}
                </p>
            </div>

            {/* Simple info */}
            <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Clock className="h-5 w-5" />
                    <span>Takes 5-10 minutes to complete</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Shield className="h-5 w-5" />
                    <span>Your responses are confidential and secure</span>
                </div>
            </div>

            {/* Start button */}
            <div className="text-center pt-8">
                <Button
                    onClick={onStart}
                    size="lg"
                    className="px-12 py-4 text-lg"
                >
                    {hasSavedProgress
                        ? "Continue Questionnaire"
                        : "Begin Questionnaire"}
                </Button>
            </div>
        </div>
    );
}
