"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { questionnaire } from "@/data/questionnaire";
import { Question } from "@/types/questionnaire";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { QuestionnaireLayout } from "./questionnaire-layout";

interface QuestionnaireSlideProps {
    questions: Question[];
    responses: Record<string, number>;
    onResponseChange: (questionId: string, value: number) => void;
    initialIndex: number;
    onComplete: () => void;
    onBackToIntro: () => void;
    onFinishEditing?: () => void;
}

export function QuestionnaireSlide({
    questions,
    responses,
    onResponseChange,
    initialIndex,
    onComplete,
    onBackToIntro,
    onFinishEditing,
}: QuestionnaireSlideProps) {
    const [index, setIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0);
    const [done, setDone] = useState(initialIndex);

    const curr = questions[index];

    const toDo = questions.findIndex(q => responses[q.id] === undefined);
    const target = toDo === -1 ? questions.length - 1 : toDo;

    const showResume = index < done && target > index;

    const handleOptionSelect = (value: number) => {
        if (!curr) return;
        onResponseChange(curr.id, value);

        // Auto-advance logic
        if (index < questions.length - 1) {
            setDirection(1);
            setTimeout(() => {
                setIndex(prev => {
                    const next = prev + 1;
                    setDone(h => Math.max(h, next));
                    return next;
                });
            }, 250);
        } else {
            setTimeout(() => {
                onComplete();
            }, 250);
        }
    };

    const handlePreviousQuestion = () => {
        if (index > 0) {
            setDirection(-1);
            setIndex(prev => prev - 1);
        } else {
            // Back to intro
            onBackToIntro();
        }
    };

    const handleResume = () => {
        setDirection(1);
        setIndex(target);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= 4) {
                handleOptionSelect(num - 1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [curr?.id, index, questions.length]);

    if (!curr) return null;

    const slideVariants = {
        enter: (direction: number) => ({
            y: direction > 0 ? 50 : -50,
            opacity: 0,
        }),
        center: {
            y: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            y: direction < 0 ? 50 : -50,
            opacity: 0,
        }),
    };

    return (
        <QuestionnaireLayout className="px-4 sm:px-6">
            {/* Top Bar: Navigation with Slider */}
            <div className="py-2 px-2 sm:px-6 flex items-center justify-between gap-4 z-20 flex-wrap">
                {/* Back/Forward Buttons */}
                <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-center max-sm:order-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePreviousQuestion}
                        className="text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 h-12 w-12"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (index < done) {
                                setDirection(1);
                                setIndex(prev => prev + 1);
                            }
                        }}
                        disabled={index >= done}
                        className="text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 h-12 w-12 disabled:opacity-30"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </Button>
                </div>

                {/* Slider Navigation */}
                <div className="flex-1 flex items-center gap-3 sm:max-w-md max-sm:w-full max-sm:justify-center max-sm:order-1">
                    <span className="text-sm font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                        {index + 1} <span className="text-muted-foreground/40">/ {questions.length}</span>
                    </span>
                    <Slider
                        value={[index]}
                        min={0}
                        max={questions.length - 1}
                        step={1}
                        onValueChange={(value) => {
                            const newIndex = Math.min(value[0], done);
                            if (newIndex !== index) {
                                setDirection(newIndex > index ? 1 : -1);
                                setIndex(newIndex);
                            }
                        }}
                        className="flex-1"
                    />
                </div>
            </div>


            {/* Main Content Area: Centered Question */}
            <div className="flex-1 flex flex-col justify-center items-center py-2 sm:py-8 max-w-3xl mx-auto w-full relative px-2">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={curr.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full min-h-36"
                    >
                        <div className="text-center">
                            <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 tracking-wide uppercase">
                                {curr.domain}
                            </span>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-snug sm:leading-tight whitespace-normal break-words">
                                {curr.text}
                            </h2>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Dock: Options */}
            <div className="mt-auto p-4 sm:p-6 z-30">
                <div className="max-w-4xl mx-auto">
                    {/* Resume Button*/}
                    <AnimatePresence>
                        {showResume && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex justify-center mb-6"
                            >
                                <button
                                    onClick={handleResume}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                                >
                                    <span className="text-sm font-medium">Resume Q{target + 1}</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {questionnaire.scale.map((option, index) => {
                            const isSelected = responses[curr.id] === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleOptionSelect(option.value)}
                                    className={cn(
                                        "relative group flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-95 touch-manipulation",
                                        isSelected
                                            ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                            : "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card hover:shadow-lg backdrop-blur-sm"
                                    )}
                                >
                                    {/* Key shortcut hint */}
                                    <span className="absolute top-2 right-3 text-[10px] font-bold text-muted-foreground/50 border border-border/50 rounded px-1.5 py-0.5 hidden md:block">
                                        {index + 1}
                                    </span>

                                    <span className={cn(
                                        "text-base sm:text-xl font-bold transition-colors",
                                        isSelected ? "text-primary" : "text-foreground"
                                    )}>
                                        {option.label}
                                    </span>

                                    {isSelected && (
                                        <motion.div
                                            layoutId="check"
                                            className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md"
                                        >
                                            <Check className="w-3 h-3" />
                                        </motion.div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Finish button when editing from review */}
                    {onFinishEditing && (
                        <div className="mt-4">
                            <Button
                                onClick={onFinishEditing}

                                className="w-full h-12"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Done Editing
                            </Button>
                        </div>
                    )}

                    <div className="text-center mt-4 text-xs text-muted-foreground/60 hidden md:block">
                        Press numbers <kbd className="font-sans px-1 bg-muted rounded border">1</kbd>-<kbd className="font-sans px-1 bg-muted rounded border">4</kbd> to select
                    </div>
                </div>
            </div>
        </QuestionnaireLayout>
    );
}
