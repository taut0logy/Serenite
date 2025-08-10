"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Shield, Heart, ChevronRight, Loader2 } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";

interface QuestionnaireIntroProps {
    onStart: () => void;
    hasSavedProgress?: boolean;
    isLoading?: boolean;
    hasInitialized?: boolean;
}

export function QuestionnaireIntro({
    onStart,
    hasSavedProgress = false,
    isLoading = false,
    hasInitialized = false,
}: QuestionnaireIntroProps) {
    return (
        <div className="max-w-4xl mx-auto p-6 min-h-[calc(100vh-4rem)] flex flex-col justify-center">
            {/* Welcome Card */}
            <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="text-center pb-6">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-foreground mb-4">
                        {questionnaire.intro.title}
                    </CardTitle>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        {questionnaire.intro.text}
                    </p>
                </CardHeader>

                <CardContent className="space-y-8 pb-8">
                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">
                                    Quick & Easy
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Takes 5-10 minutes to complete
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">
                                    Private & Secure
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Your responses are confidential
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What to expect */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-center text-foreground">
                            What to Expect
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="space-y-2">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto font-bold">
                                    1
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Answer questions about your recent
                                    experiences
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto font-bold">
                                    2
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Review your responses before submitting
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto font-bold">
                                    3
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Get personalized support recommendations
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Start button */}
                    <div className="text-center pt-4">
                        <Button
                            onClick={onStart}
                            size="lg"
                            className="px-8 py-4 text-lg h-14 shadow-lg hover:shadow-xl transition-shadow"
                            disabled={isLoading || !hasInitialized}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Loading Progress...
                                </>
                            ) : hasInitialized && hasSavedProgress ? (
                                <>
                                    Continue Assessment
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </>
                            ) : hasInitialized ? (
                                <>
                                    Begin Assessment
                                    <ChevronRight className="ml-2 h-5 w-5" />
                                </>
                            ) : (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Loading...
                                </>
                            )}
                        </Button>

                        {/* Loading message */}
                        {isLoading && (
                            <p className="text-sm text-muted-foreground mt-3">
                                Please wait while we retrieve your saved
                                responses...
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
