"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";
import { QuestionnaireLayout } from "./questionnaire-layout";
import { BANKS_BY_DOMAIN } from "@/lib/assessment/banks";
import { SCALES } from "@/lib/assessment/scales";
import type { SessionState } from "@/lib/assessment/session";
import type { DomainKey } from "@/lib/assessment/types";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const DOMAIN_LABELS: Record<DomainKey, string> = {
    depression: "Mood",
    anxiety: "Anxiety",
    trauma: "Past Experiences",
    sleep: "Sleep",
    social: "Social Life",
    selfWorth: "Self-Perception",
};

const DOMAIN_ORDER: DomainKey[] = ["depression", "anxiety", "trauma", "sleep", "social", "selfWorth"];

interface QuestionnaireReviewProps {
    session: SessionState;
    onBack: () => void;
    onSubmit: () => void;
}

export function QuestionnaireReview({ session, onBack, onSubmit }: QuestionnaireReviewProps) {
    const domainGroups = DOMAIN_ORDER.map((domain) => {
        const bank = BANKS_BY_DOMAIN[domain];
        const administered = session.responses[domain] ?? [];
        const items = administered.map((r) => {
            const item = bank.find((i) => i.id === r.itemId);
            const scale = item ? SCALES[item.scaleId] : undefined;
            return {
                text: item?.text ?? r.itemId,
                label: scale?.options.find((o) => o.value === r.value)?.label ?? String(r.value),
            };
        });
        const skipped = domain === "trauma" && session.traumaGateAnswered && !session.traumaExposed;
        return { domain, items, skipped };
    }).filter((g) => g.items.length > 0 || g.skipped);

    return (
        <QuestionnaireLayout className="px-4 sm:px-6 py-6 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <h1 className="text-xl font-semibold text-foreground">Review Responses</h1>
                <div className="w-20" />
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full overflow-auto">
                <Accordion type="multiple" className="space-y-3">
                    {domainGroups.map((group) => (
                        <AccordionItem
                            key={group.domain}
                            value={group.domain}
                            className="rounded-xl border-2 border-border/50 bg-card/50 px-4 overflow-hidden"
                        >
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 bg-primary/10 text-primary">
                                        {group.items.length}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{DOMAIN_LABELS[group.domain]}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {group.skipped ? "Skipped" : `${group.items.length} questions answered`}
                                        </p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            {group.items.length > 0 && (
                                <AccordionContent className="pb-4">
                                    <div className="space-y-2">
                                        {group.items.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                                            >
                                                <p className="text-sm text-foreground truncate flex-1 min-w-0">
                                                    {item.text}
                                                </p>
                                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                    {item.label}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            )}
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            <div className="mt-auto pt-6 max-w-2xl mx-auto w-full">
                <Button
                    onClick={onSubmit}
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
