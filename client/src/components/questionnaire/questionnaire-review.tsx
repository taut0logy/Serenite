"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, Check, Send } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";
import { Question, QuestionnaireResponses } from "@/types/questionnaire";
import { cn } from "@/lib/utils";
import { QuestionnaireLayout } from "./questionnaire-layout";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface QuestionnaireReviewProps {
    responses: QuestionnaireResponses;
    onEditAtIndex: (questionIndex: number) => void;
    onBack: () => void;
    onSubmit: () => void;
}

export function QuestionnaireReview({
    responses,
    onEditAtIndex,
    onBack,
    onSubmit,
}: QuestionnaireReviewProps) {
    // Flatten all questions to calculate global indices
    const allQuestions = Object.values(questionnaire.questions).flat();

    // Group responses by domain with start indices
    let runningIndex = 0;
    const domainGroups = Object.entries(questionnaire.questions).map(
        ([key, questions]) => {
            const startIndex = runningIndex;
            const domainResponses = questions.map((question: Question, idx: number) => ({
                question,
                globalIndex: startIndex + idx,
                response: responses[question.id],
                responseLabel:
                    responses[question.id] !== undefined
                        ? questionnaire.scale.find(
                            (s) => s.value === responses[question.id]
                        )?.label
                        : undefined,
            }));

            runningIndex += questions.length;

            return {
                domain: questions[0]?.domain || key,
                startIndex,
                questions: domainResponses,
                completed: domainResponses.every((r) => r.response !== undefined),
                answeredCount: domainResponses.filter((r) => r.response !== undefined).length,
                totalCount: domainResponses.length,
            };
        }
    );

    const totalQuestions = allQuestions.length;
    const answeredQuestions = Object.keys(responses).length;
    const isComplete = answeredQuestions === totalQuestions;

    return (
        <QuestionnaireLayout className="px-4 sm:px-6 py-6 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <h1 className="text-xl font-semibold text-foreground">
                    Review Responses
                </h1>

                <div className="w-20" />
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full overflow-auto">
                <Accordion type="multiple" className="space-y-3">
                    {domainGroups.map((group, idx) => (
                        <AccordionItem
                            key={idx}
                            value={`section-${idx}`}
                            className={cn(
                                "rounded-xl border-2 px-4 overflow-hidden",
                                group.completed
                                    ? "border-border/50 bg-card/50"
                                    : "border-orange-300/50 dark:border-orange-700/50 bg-orange-50/20 dark:bg-orange-900/10"
                            )}
                        >
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-4 text-left">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                                        group.completed
                                            ? "bg-primary/10 text-primary"
                                            : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                                    )}>
                                        {group.completed ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <span>{group.answeredCount}/{group.totalCount}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {group.domain}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {group.totalCount} questions
                                        </p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                                {/* Questions List */}
                                <div className="space-y-2 mb-4">
                                    {group.questions.map((item, qIdx) => (
                                        <div
                                            key={item.question.id}
                                            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className="text-xs font-medium text-muted-foreground w-5 flex-shrink-0">
                                                    {qIdx + 1}.
                                                </span>
                                                <p className="text-sm text-foreground truncate">
                                                    {item.question.text}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {item.response !== undefined ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {item.responseLabel}
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400"
                                                    >
                                                        Skipped
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Jump Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEditAtIndex(group.startIndex)}
                                    className="w-full"
                                >
                                    Edit Section
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            <div className="mt-auto pt-6 max-w-2xl mx-auto w-full">
                {!isComplete && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 text-center mb-4">
                        Complete all sections to submit
                    </p>
                )}
                <Button
                    onClick={onSubmit}
                    disabled={!isComplete}
                    size="lg"
                    className="w-full h-14 text-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                    <Send className="mr-2 h-5 w-5" />
                    Submit Assessment
                </Button>
            </div>
        </QuestionnaireLayout>
    );
}
