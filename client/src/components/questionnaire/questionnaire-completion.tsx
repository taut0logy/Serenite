"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CheckCircle2,
    ArrowRight,
    Eye,
    Loader2,
} from "lucide-react";

interface QuestionnaireCompletionProps {
    onSubmit: () => void;
    onReview: () => void;
    isSubmitting?: boolean;
}

export function QuestionnaireCompletion({
    onSubmit,
    onReview,
    isSubmitting = false,
}: QuestionnaireCompletionProps) {

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 min-h-[calc(100vh-4rem)] flex flex-col justify-center">
            {/* Completion Card */}
            <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="text-center pb-6">
                    <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-foreground mb-4">
                        🎉 Assessment Complete!
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-8 pb-8">

                    {/* What's Next */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-center text-foreground">
                            What Happens Next?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                                    1
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Your responses are analyzed for personalized
                                    insights
                                </p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                                    2
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Tailored support recommendations are
                                    generated
                                </p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                                    3
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    You receive your personalized mental health
                                    plan
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                        <Button
                            onClick={onSubmit}
                            size="lg"
                            disabled={isSubmitting}
                            className="flex-1 py-4 text-lg h-14 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit Assessment
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onReview}
                            size="lg"
                            disabled={isSubmitting}
                            className="flex-1 py-4 text-lg h-14"
                        >
                            <Eye className="mr-2 h-5 w-5" />
                            Review My Responses
                        </Button>
                    </div>

                    {/* Security notice */}
                    <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/30">
                        <p className="text-sm text-muted-foreground">
                            🔒 Your responses are completely confidential and
                            securely encrypted
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
