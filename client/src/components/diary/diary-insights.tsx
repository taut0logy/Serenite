"use client";

import type { DiaryEntryView, MoodView } from "@/lib/diary/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoodChart } from "@/components/diary/mood-chart";

interface DiaryInsightsProps {
    currentAnalysis: MoodView | null;
    recentEntries: DiaryEntryView[];
    isAnalyzing: boolean;
}

export function DiaryInsights({ currentAnalysis, recentEntries, isAnalyzing }: DiaryInsightsProps) {
    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
            {currentAnalysis && (
                <Card className="bg-gradient-to-br from-background to-muted/50 border-none shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            ✨ AI Insight
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Current Mood</span>
                                <span className="text-xl font-bold text-primary capitalize">{currentAnalysis.mood}</span>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Confidence</span>
                                    <span>{Math.round(currentAnalysis.confidence * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-500" 
                                        style={{ width: `${currentAnalysis.confidence * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-background/50 rounded-lg text-sm leading-relaxed border">
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-base">Mood Trends</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="h-[200px] w-full">
                         <MoodChart
                            // Entries the analyser could not score have no
                            // mood, and plotting them as "neutral" would show
                            // a reading nobody took.
                            data={recentEntries
                                .filter((entry) => entry.mood !== null)
                                .slice(0, 7)
                                .map((entry) => ({
                                    date: entry.entryDate,
                                    mood: entry.mood as string,
                                    confidence: entry.confidence ?? 0,
                                }))}
                        />
                    </div>
                </CardContent>
            </Card>

            {!currentAnalysis && !isAnalyzing && (
                 <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Write and analyze your entry to see AI insights here.
                 </div>
            )}
            
            {isAnalyzing && (
                 <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground animate-pulse">
                    Analyzing your thoughts...
                 </div>
            )}
        </div>
    );
}
