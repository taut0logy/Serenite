"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface QuestionnaireCompletionProps {
    responses: Record<string, number>;
    onSubmit: () => void;
    onReview: () => void;
}

export function QuestionnaireCompletion({
    responses,
    onSubmit,
    onReview,
}: QuestionnaireCompletionProps) {
    const answeredQuestions = Object.keys(responses).length;

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                    Questionnaire Complete!
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                    Thank you for taking the time to complete the questionnaire.
                    Your responses will help us provide personalized support.
                </p>
            </div>

            {/* Simple stats */}
            <div className="text-center p-6 bg-muted/30 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-2">
                    {answeredQuestions}
                </div>
                <div className="text-muted-foreground">Questions Answered</div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4 pt-6">
                <Button
                    onClick={onSubmit}
                    size="lg"
                    className="w-full py-4 text-lg flex items-center justify-center gap-2"
                >
                    Submit Responses
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                    variant="outline"
                    onClick={onReview}
                    className="w-full py-3"
                >
                    Review Responses
                </Button>
            </div>

            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    Your responses are confidential and secure
                </p>
            </div>
        </div>
    );
}
