'use client';

import { useState, useCallback } from 'react';
import { QuestionnaireState, QuestionnaireResponses } from '@/types/questionnaire';

export function useQuestionnaire() {
    const [state, setState] = useState<QuestionnaireState>('intro');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [responses, setResponses] = useState<QuestionnaireResponses>({});

    const startQuestionnaire = useCallback(() => {
        setState('questions');
        setCurrentSlide(0);
    }, []);

    const updateResponse = useCallback((questionId: string, value: number) => {
        setResponses(prev => ({
            ...prev,
            [questionId]: value
        }));
    }, []);

    const nextSlide = useCallback((totalSlides: number) => {
        if (currentSlide < totalSlides - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            setState('completion');
        }
    }, [currentSlide]);

    const previousSlide = useCallback(() => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    }, [currentSlide]);

    const completeQuestionnaire = useCallback(() => {
        setState('completion');
    }, []);

    const reviewResponses = useCallback(() => {
        setState('questions');
        setCurrentSlide(0);
    }, []);

    const resetQuestionnaire = useCallback(() => {
        setState('intro');
        setCurrentSlide(0);
        setResponses({});
    }, []);

    return {
        state,
        currentSlide,
        responses,
        startQuestionnaire,
        updateResponse,
        nextSlide,
        previousSlide,
        completeQuestionnaire,
        reviewResponses,
        resetQuestionnaire,
    };
}
