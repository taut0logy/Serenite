"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";
import { Question } from "@/types/questionnaire";
import { useKeyboardNavigation } from "@/hooks/use-questionnaire-storage";

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
    canGoNext,
    canGoPrevious,
    currentSlide,
    totalSlides,
    allPreviousCompleted,
}: QuestionnaireSlideProps) {
    const progress = (currentSlide / totalSlides) * 100;

    const isSlideComplete = questions.every(
        (q) => responses[q.id] !== undefined
    );
    const canGoForward = canGoNext && isSlideComplete && allPreviousCompleted;

    // Add keyboard navigation
    useKeyboardNavigation(
        onNext,
        onPrevious,
        canGoForward,
        canGoPrevious,
        isSlideComplete
    );

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Minimal progress bar */}
            <div className="space-y-3">
                <Progress value={progress} className="w-full h-2" />
                <div className="text-center">
                    <span className="text-sm text-muted-foreground">
                        Section {currentSlide} of {totalSlides}
                    </span>
                </div>
            </div>

            {/* Instructions */}
            <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                    Over the last 2 weeks, how often have you been bothered by
                    any of the following problems?
                </p>
            </div>

            {/* Questions */}
            <div className="space-y-12">
                {questions.map((question) => (
                    <div key={question.id} className="space-y-6">
                        {/* Question text - make it pop */}
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-foreground leading-relaxed px-4">
                                {question.text}
                            </h2>
                        </div>

                        {/* Response options */}
                        <RadioGroup
                            value={responses[question.id]?.toString() || ""}
                            onValueChange={(value) =>
                                onResponseChange(question.id, parseInt(value))
                            }
                            className="grid grid-cols-2 md:grid-cols-4 gap-4"
                        >
                            {questionnaire.scale.map((option) => (
                                <div key={option.value} className="space-y-2">
                                    <div className="flex items-center justify-center">
                                        <RadioGroupItem
                                            value={option.value.toString()}
                                            id={`${question.id}-${option.value}`}
                                            className="w-5 h-5"
                                        />
                                    </div>
                                    <Label
                                        htmlFor={`${question.id}-${option.value}`}
                                        className="text-sm text-center block cursor-pointer hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted/50"
                                    >
                                        <div className="font-medium mb-1">
                                            {option.value}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {option.label}
                                        </div>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-8">
                <Button
                    variant="outline"
                    onClick={onPrevious}
                    disabled={!canGoPrevious}
                    className="flex items-center gap-2"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>

                <Button
                    onClick={onNext}
                    disabled={!canGoForward}
                    className="flex items-center gap-2"
                >
                    {currentSlide === totalSlides ? "Complete" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Help text */}
            {!isSlideComplete && (
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Please answer all questions to continue
                    </p>
                </div>
            )}

            {!allPreviousCompleted && isSlideComplete && (
                <div className="text-center">
                    <p className="text-sm text-orange-600">
                        Complete previous sections to proceed
                    </p>
                </div>
            )}
        </div>
    );
}
