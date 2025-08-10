"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";
import { Question } from "@/types/questionnaire";
import { useKeyboardNavigation } from "@/hooks/use-questionnaire";
import { cn } from "@/lib/utils";

interface QuestionnaireSlideProps {
    questions: Question[];
    responses: Record<string, number>;
    onResponseChange: (questionId: string, value: number) => void;
    onNext: () => void;
    onPrevious: () => void;
    canGoNext: boolean;
    canGoPrevious: boolean;
    currentSlide: number;
    totalSlides: number;
    allPreviousCompleted: boolean;
}

export function QuestionnaireSlide({
    questions,
    responses,
    onResponseChange,
    onNext,
    onPrevious,
    canGoPrevious,
    currentSlide,
    totalSlides,
    allPreviousCompleted,
}: QuestionnaireSlideProps) {
    const progress = (currentSlide / totalSlides) * 100;

    const isSlideComplete = questions.every(
        (q) => responses[q.id] !== undefined
    );

    // Add debugging to see responses
    console.log("QuestionnaireSlide render:", {
        currentSlide,
        responsesCount: Object.keys(responses).length,
        responses,
        questionIds: questions.map((q) => q.id),
        answeredQuestions: questions
            .filter((q) => responses[q.id] !== undefined)
            .map((q) => q.id),
    });

    // Allow moving forward if current slide is complete AND either:
    // 1. All previous slides are complete (normal flow)
    // 2. This is the last slide (allow completion even with partial previous answers)
    const isLastSlide = currentSlide === totalSlides;
    const canGoForward = isSlideComplete && allPreviousCompleted;

    // Add keyboard navigation
    useKeyboardNavigation(
        onNext,
        onPrevious,
        canGoForward,
        canGoPrevious,
        isSlideComplete
    );

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-screen flex flex-col">
            {/* Header with progress */}
            <div className="space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Section {currentSlide} of {totalSlides}
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Over the last 2 weeks, how often have you been bothered
                        by any of the following problems?
                    </p>
                </div>

                <div className="space-y-3">
                    <Progress
                        value={progress}
                        className="w-full h-3 bg-muted"
                    />
                    <div className="text-center">
                        <span className="text-sm text-muted-foreground">
                            {Math.round(progress)}% Complete
                        </span>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="flex-1 space-y-12">
                {questions.map((question, questionIndex) => (
                    <Card
                        key={question.id}
                        className="shadow-lg border-2 border-border/50 bg-gradient-to-br from-card to-muted/20"
                    >
                        <CardContent className="p-8">
                            {/* Question number and text */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg mb-4">
                                    {questionIndex +
                                        1 +
                                        (currentSlide - 1) * questions.length}
                                </div>
                                <h2 className="text-xl font-semibold text-foreground leading-relaxed max-w-3xl mx-auto">
                                    {question.text}
                                </h2>
                            </div>

                            {/* Response options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {questionnaire.scale.map((option) => {
                                    const isSelected =
                                        responses[question.id] === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() =>
                                                onResponseChange(
                                                    question.id,
                                                    option.value
                                                )
                                            }
                                            className={cn(
                                                "relative p-6 rounded-xl border-2 transition-all duration-200 text-left group hover:shadow-lg",
                                                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-md scale-105"
                                                    : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
                                            )}
                                        >
                                            {/* Selection indicator */}
                                            <div
                                                className={cn(
                                                    "absolute top-3 right-3 w-6 h-6 rounded-full border-2 transition-all duration-200",
                                                    isSelected
                                                        ? "border-primary bg-primary"
                                                        : "border-muted-foreground/30 group-hover:border-primary/50"
                                                )}
                                            >
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-primary-foreground absolute top-0.5 left-0.5" />
                                                )}
                                            </div>

                                            {/* Option content */}
                                            <div className="space-y-2">
                                                <div
                                                    className={cn(
                                                        "text-3xl font-bold transition-colors",
                                                        isSelected
                                                            ? "text-primary"
                                                            : "text-foreground"
                                                    )}
                                                >
                                                    {option.value}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "text-sm leading-snug transition-colors",
                                                        isSelected
                                                            ? "text-foreground"
                                                            : "text-muted-foreground"
                                                    )}
                                                >
                                                    {option.label}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8 border-t border-border/50">
                <Button
                    variant="outline"
                    onClick={onPrevious}
                    disabled={!canGoPrevious}
                    className="flex items-center gap-2 h-12 px-6 text-base"
                    size="lg"
                >
                    <ChevronLeft className="h-5 w-5" />
                    Previous
                </Button>

                <div className="flex flex-col items-center space-y-2">
                    {!isSlideComplete && (
                        <p className="text-sm text-muted-foreground text-center">
                            Please answer all questions to continue
                        </p>
                    )}
                    {!allPreviousCompleted &&
                        isSlideComplete &&
                        !isLastSlide && (
                            <p className="text-sm text-orange-600 font-medium text-center">
                                Complete previous sections to proceed
                            </p>
                        )}
                    {!allPreviousCompleted &&
                        isSlideComplete &&
                        isLastSlide && (
                            <p className="text-sm text-blue-600 font-medium text-center">
                                You can complete the assessment now or go back
                                to finish previous sections
                            </p>
                        )}
                </div>

                <Button
                    onClick={onNext}
                    disabled={!canGoForward}
                    className="flex items-center gap-2 h-12 px-6 text-base"
                    size="lg"
                >
                    {isLastSlide ? "Complete Assessment" : "Next"}
                    <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
