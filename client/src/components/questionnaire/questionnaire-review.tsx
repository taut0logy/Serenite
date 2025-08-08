"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Edit2, ArrowLeft, Check, AlertTriangle, Send } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";
import { Question, QuestionnaireResponses } from "@/types/questionnaire";
import { cn } from "@/lib/utils";

interface QuestionnaireReviewProps {
    responses: QuestionnaireResponses;
    onEdit: (slideIndex: number) => void;
    onBack: () => void;
    onSubmit: () => void;
}

export function QuestionnaireReview({
    responses,
    onEdit,
    onBack,
    onSubmit,
}: QuestionnaireReviewProps) {
    // Group responses by domain
    const domainGroups = Object.entries(questionnaire.questions).map(
        ([key, questions], index) => {
            const domainResponses = questions.map((question: Question) => ({
                question,
                response: responses[question.id],
                responseLabel:
                    responses[question.id] !== undefined
                        ? questionnaire.scale.find(
                              (s) => s.value === responses[question.id]
                          )?.label
                        : "Not answered",
            }));

            return {
                domain: questions[0]?.domain || key,
                slideIndex: index,
                questions: domainResponses,
                completed: domainResponses.every(
                    (r) => r.response !== undefined
                ),
                answeredCount: domainResponses.filter(
                    (r) => r.response !== undefined
                ).length,
                totalCount: domainResponses.length,
            };
        }
    );

    const totalQuestions = Object.values(questionnaire.questions).reduce(
        (acc, questions) => acc + questions.length,
        0
    );
    const answeredQuestions = Object.keys(responses).length;
    const completionPercentage = Math.round(
        (answeredQuestions / totalQuestions) * 100
    );
    const isComplete = answeredQuestions === totalQuestions;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-screen">
            {/* Header Card */}
            <Card className="shadow-lg border-2 border-border/50 bg-gradient-to-r from-card to-muted/20">
                <CardHeader className="pb-6">
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="flex items-center gap-2 hover:bg-muted/50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Assessment
                        </Button>
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                                isComplete
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                            )}
                        >
                            {isComplete ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                            {isComplete ? "Complete" : "In Progress"}
                        </div>
                    </div>

                    <div className="text-center space-y-4">
                        <CardTitle className="text-3xl font-bold text-foreground">
                            Review Your Assessment
                        </CardTitle>
                        <p className="text-lg text-muted-foreground">
                            Please review your responses before submitting your
                            assessment
                        </p>

                        {/* Progress Stats */}
                        <div className="space-y-3">
                            <Progress
                                value={completionPercentage}
                                className="w-full h-3 bg-muted"
                            />
                            <div className="flex justify-center gap-6 text-sm">
                                <span className="text-primary font-semibold">
                                    {answeredQuestions}/{totalQuestions}{" "}
                                    answered
                                </span>
                                <span className="text-muted-foreground">
                                    {completionPercentage}% complete
                                </span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Domain sections */}
            <ScrollArea className="h-[60vh]">
                <div className="space-y-6">
                    {domainGroups.map((group) => (
                        <Card
                            key={group.domain}
                            className={cn(
                                "shadow-md border-2 transition-all",
                                group.completed
                                    ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                                    : "border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10"
                            )}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl font-semibold">
                                            Section {group.slideIndex + 1}:{" "}
                                            {group.domain}
                                        </CardTitle>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1 text-sm font-medium",
                                                    group.completed
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-orange-600 dark:text-orange-400"
                                                )}
                                            >
                                                {group.completed ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4" />
                                                )}
                                                {group.answeredCount}/
                                                {group.totalCount} completed
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(group.slideIndex)}
                                        className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary/50"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        Edit Section
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {group.questions.map((item, index) => (
                                    <div
                                        key={item.question.id}
                                        className="flex items-start gap-4 p-3 rounded-lg bg-background/50 border border-border/30"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground leading-relaxed">
                                                {item.question.text}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {item.response !== undefined ? (
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="default"
                                                        className="text-sm font-medium"
                                                    >
                                                        {item.response}
                                                    </Badge>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.responseLabel}
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-sm border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400"
                                                >
                                                    Not answered
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>

            {/* Action buttons */}
            <Card className="shadow-lg border-2 border-border/50">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={onBack}
                            size="lg"
                            className="w-full sm:w-auto"
                        >
                            Continue Editing
                        </Button>

                        <div className="flex flex-col items-center gap-2">
                            {!isComplete && (
                                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium text-center">
                                    Please complete all sections before
                                    submitting
                                </p>
                            )}
                        </div>

                        <Button
                            onClick={onSubmit}
                            disabled={!isComplete}
                            size="lg"
                            className="w-full sm:w-auto px-8 h-12 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <Send className="mr-2 h-5 w-5" />
                            Submit Assessment
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
