"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, Send } from "lucide-react";
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
    canGoBack: boolean;
    /** A tapped option. Carries the option value directly. */
    onAnswer: (value: number) => void;
    /** Free text, to be mapped onto an option by the caller. */
    onFreeText: (text: string) => void;
    /** A classification call is in flight. */
    isClassifying: boolean;
    /** The previous free-text answer could not be mapped to an option. */
    unclear: boolean;
    onBack: () => void;
}

export function QuestionnaireSlide({
    item,
    domainIndex,
    totalDomains,
    canGoBack,
    onAnswer,
    onFreeText,
    isClassifying,
    unclear,
    onBack,
}: QuestionnaireSlideProps) {
    const scale = SCALES[item.scaleId];
    const [text, setText] = useState("");
    const [writing, setWriting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // A new item is a fresh answer: never carry typed text across items.
    useEffect(() => {
        setText("");
        setWriting(false);
    }, [item.id]);

    useEffect(() => {
        if (writing) textareaRef.current?.focus();
    }, [writing]);

    const submitText = () => {
        const trimmed = text.trim();
        if (trimmed.length === 0 || isClassifying) return;
        onFreeText(trimmed);
        setText("");
    };

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
                            {/* Item text is rendered from the bank, never from a model. */}
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-snug sm:leading-tight whitespace-normal break-words">
                                {item.text}
                            </h2>
                            {unclear && (
                                <p className="text-sm text-muted-foreground mt-4">
                                    Sorry, that one did not quite land for us. Could you pick an option below,
                                    or put it another way?
                                </p>
                            )}
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
                                disabled={isClassifying}
                                className={cn(
                                    "relative group flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-95 touch-manipulation",
                                    "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card hover:shadow-lg backdrop-blur-sm",
                                    "disabled:opacity-50 disabled:pointer-events-none"
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

                    <div className="mt-4 max-w-2xl mx-auto">
                        {writing ? (
                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            submitText();
                                        }
                                        if (e.key === "Escape") setWriting(false);
                                    }}
                                    rows={2}
                                    placeholder="Answer in your own words"
                                    disabled={isClassifying}
                                    className="flex-1 resize-none rounded-xl border-2 border-border/50 bg-card/50 p-3 text-sm text-foreground backdrop-blur-sm outline-none focus:border-primary/50 disabled:opacity-50"
                                />
                                <Button
                                    size="icon"
                                    onClick={submitText}
                                    disabled={text.trim().length === 0 || isClassifying}
                                    className="h-11 w-11 shrink-0"
                                    aria-label="Send answer"
                                >
                                    {isClassifying ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setWriting(true)}
                                className="mx-auto block text-xs text-muted-foreground/70 underline underline-offset-4 hover:text-foreground"
                            >
                                or answer in your own words
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </QuestionnaireLayout>
    );
}
