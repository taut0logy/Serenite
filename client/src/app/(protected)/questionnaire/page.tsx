"use client";

import { useState, useEffect } from "react";
import { questionnaire } from "@/data/questionnaire";
import {
    QuestionnaireIntro,
    QuestionnaireSlide,
    QuestionnaireCompletion,
} from "@/components/questionnaire";
import { QuestionnaireReview } from "@/components/questionnaire/questionnaire-review";
import { Question, QuestionnaireState } from "@/types/questionnaire";
import { useQuestionnaireStorage } from "@/hooks/use-questionnaire-storage";

type ExtendedQuestionnaireState = QuestionnaireState | "review";

export default function QuestionnairePage() {
    const [state, setState] = useState<ExtendedQuestionnaireState>("intro");
    const [currentSlide, setCurrentSlide] = useState(0);
    const [responses, setResponses] = useState<Record<string, number>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasSavedProgress, setHasSavedProgress] = useState(false);
    const [savedSlideIndex, setSavedSlideIndex] = useState(0);

    const {
        saveResponses,
        loadResponses,
        saveCurrentSlide,
        loadCurrentSlide,
        clearStorage,
    } = useQuestionnaireStorage();

    // Load saved data on mount but stay on intro
    useEffect(() => {
        const savedResponses = loadResponses();
        const savedSlide = loadCurrentSlide();

        setResponses(savedResponses);
        setSavedSlideIndex(savedSlide);

        // Check if there are saved responses to show resume option
        if (Object.keys(savedResponses).length > 0) {
            setHasSavedProgress(true);
        }

        setIsLoaded(true);
    }, [loadResponses, loadCurrentSlide]);

    // Save responses whenever they change
    useEffect(() => {
        if (isLoaded) {
            saveResponses(responses);
        }
    }, [responses, saveResponses, isLoaded]);

    // Save current slide whenever it changes
    useEffect(() => {
        if (isLoaded && state === "questions") {
            saveCurrentSlide(currentSlide);
        }
    }, [currentSlide, saveCurrentSlide, isLoaded, state]);

    // Convert questionnaire data to slides
    const slides: { domain: string; questions: Question[] }[] = Object.entries(
        questionnaire.questions
    ).map(([key, questions]) => ({
        domain: key,
        questions: questions as Question[],
    }));

    const totalSlides = slides.length;

    const handleStart = () => {
        setState("questions");
        // If there's saved progress, resume from saved position, otherwise start from beginning
        if (hasSavedProgress) {
            setCurrentSlide(savedSlideIndex);
        } else {
            setCurrentSlide(0);
        }
    };

    const handleResponseChange = (questionId: string, value: number) => {
        setResponses((prev) => ({
            ...prev,
            [questionId]: value,
        }));
    };

    const handleNext = () => {
        if (currentSlide < totalSlides - 1) {
            setCurrentSlide((prev) => prev + 1);
        } else {
            setState("completion");
        }
    };

    const handlePrevious = () => {
        if (currentSlide > 0) {
            setCurrentSlide((prev) => prev - 1);
        }
    };

    // Check if all previous slides are completed
    const getAllPreviousCompleted = (slideIndex: number): boolean => {
        for (let i = 0; i < slideIndex; i++) {
            const slideQuestions = slides[i].questions;
            const isSlideComplete = slideQuestions.every(
                (q) => responses[q.id] !== undefined
            );
            if (!isSlideComplete) {
                return false;
            }
        }
        return true;
    };

    const allPreviousCompleted = getAllPreviousCompleted(currentSlide);

    const handleSubmit = () => {
        // TODO: Submit responses to backend
        console.log("Submitting responses:", responses);

        // Clear stored data after successful submission
        clearStorage();

        // For now, just log the responses
        alert("Questionnaire submitted successfully!");
    };

    const handleReview = () => {
        setState("review");
    };

    const handleEditFromReview = (slideIndex: number) => {
        setState("questions");
        setCurrentSlide(slideIndex);
    };

    const handleBackFromReview = () => {
        setState("completion");
    };

    const canGoNext = currentSlide < totalSlides - 1;
    const canGoPrevious = currentSlide > 0;

    if (state === "intro") {
        return (
            <QuestionnaireIntro
                onStart={handleStart}
                hasSavedProgress={hasSavedProgress}
            />
        );
    }

    if (state === "review") {
        return (
            <QuestionnaireReview
                responses={responses}
                onEdit={handleEditFromReview}
                onBack={handleBackFromReview}
                onSubmit={handleSubmit}
            />
        );
    }

    if (state === "completion") {
        return (
            <QuestionnaireCompletion
                responses={responses}
                onSubmit={handleSubmit}
                onReview={handleReview}
            />
        );
    }

    const currentSlideData = slides[currentSlide];

    return (
        <QuestionnaireSlide
            questions={currentSlideData.questions}
            responses={responses}
            onResponseChange={handleResponseChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            currentSlide={currentSlide + 1}
            totalSlides={totalSlides}
            allPreviousCompleted={allPreviousCompleted}
        />
    );
}
