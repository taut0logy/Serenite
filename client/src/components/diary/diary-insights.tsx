"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";

import type { DiaryEntryView, MoodView } from "@/lib/diary/types";
import { moodMeta } from "@/lib/diary/mood";
import { cn } from "@/lib/utils";
import { MoodChart } from "@/components/diary/mood-chart";
import { ReflectionPrompts } from "@/components/diary/reflection-prompts";

interface DiaryInsightsProps {
    currentAnalysis: MoodView | null;
    recentEntries: DiaryEntryView[];
    isAnalyzing: boolean;
    onSelectPrompt: (prompt: string) => void;
}

/** Below this the label is a shrug, not a reading, and is presented as one. */
const LOW_CONFIDENCE = 0.5;

export function DiaryInsights({
    currentAnalysis,
    recentEntries,
    isAnalyzing,
    onSelectPrompt,
}: DiaryInsightsProps) {
    const scored = useMemo(
        () =>
            recentEntries
                .filter((entry) => entry.mood !== null)
                // Entries the analyser could not score have no mood, and
                // plotting them as "neutral" would show a reading nobody took.
                .slice(0, 14)
                .map((entry) => ({
                    date: entry.entryDate,
                    mood: entry.mood as string,
                    confidence: entry.confidence ?? 0,
                })),
        [recentEntries]
    );

    const meta = currentAnalysis ? moodMeta(currentAnalysis.mood) : null;
    const lowConfidence = !!currentAnalysis && currentAnalysis.confidence < LOW_CONFIDENCE;

    return (
        <div className="flex h-full flex-col gap-5 overflow-y-auto">
            <section>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    This entry
                </h2>

                {isAnalyzing ? (
                    <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                        <span className="animate-pulse">Reading what you wrote…</span>
                    </div>
                ) : currentAnalysis && meta ? (
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">Mood</span>
                            <span
                                className={cn(
                                    "rounded-full px-2.5 py-1 text-sm font-medium",
                                    meta.chip
                                )}
                            >
                                {meta.label}
                            </span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Confidence</span>
                                <span>{Math.round(currentAnalysis.confidence * 100)}%</span>
                            </div>
                            <div
                                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                                role="progressbar"
                                aria-valuenow={Math.round(currentAnalysis.confidence * 100)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Confidence in the mood label"
                            >
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${currentAnalysis.confidence * 100}%` }}
                                />
                            </div>
                        </div>

                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                            {lowConfidence
                                ? "A rough guess from one entry, and not a confident one. Treat it as a prompt to reflect, not a description of you."
                                : "A guess from this entry alone. It is not a diagnosis, and you know better than it does."}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                        Save an entry and a mood reading appears here.
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-2 text-sm font-semibold">Mood over time</h2>
                <div className="h-[190px] w-full">
                    <MoodChart data={scored} />
                </div>
            </section>

            <section>
                <ReflectionPrompts onSelectPrompt={onSelectPrompt} />
            </section>
        </div>
    );
}
