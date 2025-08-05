"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, ArrowLeft } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";
import { Question, QuestionnaireResponses } from "@/types/questionnaire";

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
            };
        }
    );

    const totalQuestions = Object.values(questionnaire.questions).reduce(
        (acc, questions) => acc + questions.length,
        0
    );
    const answeredQuestions = Object.keys(responses).length;

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-bold">
                        Review Your Responses
                    </h1>
                    <p className="text-muted-foreground">
                        {answeredQuestions}/{totalQuestions} questions answered
                    </p>
                </div>
            </div>

            {/* Domain sections */}
            <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                    {domainGroups.map((group) => (
                        <Card key={group.domain} className="border">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        Section {group.slideIndex + 1}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {
                                                group.questions.filter(
                                                    (q) =>
                                                        q.response !== undefined
                                                ).length
                                            }
                                            /{group.questions.length}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                onEdit(group.slideIndex)
                                            }
                                            className="flex items-center gap-2"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                            Edit
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {group.questions.map((item) => (
                                    <div
                                        key={item.question.id}
                                        className="flex items-center justify-between py-1"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm">
                                                {item.question.text}
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            {item.response !== undefined ? (
                                                <Badge
                                                    variant="default"
                                                    className="text-xs"
                                                >
                                                    {item.response}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs border-orange-300 text-orange-600"
                                                >
                                                    Missing
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
            <div className="flex justify-between items-center pt-6 border-t">
                <Button variant="outline" onClick={onBack}>
                    Continue Editing
                </Button>
                <Button
                    onClick={onSubmit}
                    disabled={answeredQuestions !== totalQuestions}
                    size="lg"
                    className="px-8"
                >
                    Submit Questionnaire
                </Button>
            </div>

            {answeredQuestions !== totalQuestions && (
                <div className="text-center">
                    <p className="text-sm text-orange-600">
                        Please complete all questions before submitting
                    </p>
                </div>
            )}
        </div>
    );
}
