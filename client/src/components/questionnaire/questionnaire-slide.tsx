"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { SCALES } from "@/lib/assessment/scales";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { QuestionnaireLayout } from "./questionnaire-layout";
import type { BankItem, DomainKey } from "@/lib/assessment/types";

const DOMAIN_LABELS: Record<DomainKey, string> = {
    depression: "Mood",
    anxiety: "Anxiety",
    trauma: "Past Experiences",
    sleep: "Sleep",
    social: "Social Life",
    selfWorth: "Self-Perception",
};

interface QuestionnaireSlideProps {
    item: BankItem;
    domainIndex: number;
    totalDomains: number;
    transitionMessage?: string;
    canGoBack: boolean;
    onAnswer: (value: number) => void;
    onBack: () => void;
}

export function QuestionnaireSlide({
    item,
    domainIndex,
    totalDomains,
    transitionMessage,
    canGoBack,
    onAnswer,
    onBack,
}: QuestionnaireSlideProps) {
    const scale = SCALES[item.scaleId];

    return (
        <QuestionnaireLayout className="px-4 sm:px-6">
            <div className="py-4 px-2 sm:px-6 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    disabled={!canGoBack}
                    className="text-muted-foreground hover:text-foreground h-10 w-10 disabled:opacity-30"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>

                <div className="flex-1 flex items-center gap-2">
                    {Array.from({ length: totalDomains }, (_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 flex-1 rounded-full transition-colors",
                                i < domainIndex ? "bg-primary" : i === domainIndex ? "bg-primary/50" : "bg-muted"
                            )}
                        />
                    ))}
                </div>

                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {domainIndex + 1} / {totalDomains}
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center py-2 sm:py-8 max-w-3xl mx-auto w-full relative px-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={item.id}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -30, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="w-full min-h-36"
                    >
                        <div className="text-center">
                            <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 tracking-wide uppercase">
                                {DOMAIN_LABELS[item.domain]}
                            </span>
                            {transitionMessage && (
                                <p className="text-sm text-muted-foreground mb-3 italic">
                                    {transitionMessage}
                                </p>
                            )}
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-snug sm:leading-tight whitespace-normal break-words">
                                {item.text}
                            </h2>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-auto p-4 sm:p-6 z-30">
                <div className="max-w-4xl mx-auto">
                    <div
                        className={cn(
                            "grid gap-3 sm:gap-4",
                            scale.options.length <= 2
                                ? "grid-cols-2 max-w-md mx-auto"
                                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                        )}
                    >
                        {scale.options.map((option, index) => (
                            <button
                                key={option.value}
                                onClick={() => onAnswer(option.value)}
                                className={cn(
                                    "relative group flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-95 touch-manipulation",
                                    "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card hover:shadow-lg backdrop-blur-sm"
                                )}
                            >
                                <span className="absolute top-2 right-3 text-[10px] font-bold text-muted-foreground/50 border border-border/50 rounded px-1.5 py-0.5 hidden md:block">
                                    {index + 1}
                                </span>
                                <span className="text-base sm:text-xl font-bold text-foreground transition-colors">
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="text-center mt-4 text-xs text-muted-foreground/60 hidden md:block">
                        Press numbers <kbd className="font-sans px-1 bg-muted rounded border">1</kbd>-<kbd className="font-sans px-1 bg-muted rounded border">{scale.options.length}</kbd> to select
                    </div>
                </div>
            </div>
        </QuestionnaireLayout>
    );
}
