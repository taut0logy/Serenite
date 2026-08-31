"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriorityKey } from "@/lib/assessment/session";
import { isValidPriorityRanking } from "@/lib/assessment/session";

const PRIORITY_LABELS: Record<PriorityKey, string> = {
    mood: "Lifting my mood",
    worry: "Managing worry and anxiety",
    sleep: "Sleeping better",
    connection: "Feeling more connected to others",
    selfCriticism: "Being less hard on myself",
};

const ALL_PRIORITIES: PriorityKey[] = ["mood", "worry", "sleep", "connection", "selfCriticism"];

interface PrioritiesRankingProps {
    onSubmit: (ranking: PriorityKey[]) => void;
}

export function PrioritiesRanking({ onSubmit }: PrioritiesRankingProps) {
    const [ranking, setRanking] = useState<PriorityKey[]>([]);

    const toggle = (key: PriorityKey) => {
        setRanking((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const complete = isValidPriorityRanking(ranking);

    return (
        <div className="max-w-2xl mx-auto p-6 min-h-[calc(100vh-65px)] flex flex-col justify-center">
            <Card className="shadow-xl border-2 border-border/50">
                <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold text-foreground mb-2">
                        One last thing
                    </CardTitle>
                    <p className="text-muted-foreground">
                        Tap these in the order you would most like help with them.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                    <div className="space-y-3">
                        {ALL_PRIORITIES.map((key) => {
                            const position = ranking.indexOf(key);
                            const selected = position !== -1;
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggle(key)}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                                        selected
                                            ? "border-primary bg-primary/10"
                                            : "border-border/50 bg-card/50 hover:border-primary/50"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                                            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {selected ? position + 1 : ""}
                                    </span>
                                    <span className="text-foreground font-medium">{PRIORITY_LABELS[key]}</span>
                                </button>
                            );
                        })}
                    </div>

                    <Button
                        onClick={() => onSubmit(ranking)}
                        disabled={!complete}
                        size="lg"
                        className="w-full h-12"
                    >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
