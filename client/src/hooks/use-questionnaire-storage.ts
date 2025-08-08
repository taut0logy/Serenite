'use client';

import { useEffect, useCallback } from 'react';
import { QuestionnaireResponses } from '@/types/questionnaire';

const STORAGE_KEY = 'questionnaire_responses';
const SLIDE_KEY = 'questionnaire_current_slide';

export function useQuestionnaireStorage() {
    const saveResponses = useCallback((responses: QuestionnaireResponses) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
        } catch (error) {
            console.warn('Failed to save questionnaire responses:', error);
        }
    }, []);

    const loadResponses = useCallback((): QuestionnaireResponses => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Failed to load questionnaire responses:', error);
            return {};
        }
    }, []);

    const saveCurrentSlide = useCallback((slide: number) => {
        try {
            localStorage.setItem(SLIDE_KEY, slide.toString());
        } catch (error) {
            console.warn('Failed to save current slide:', error);
        }
    }, []);

    const loadCurrentSlide = useCallback((): number => {
        try {
            const saved = localStorage.getItem(SLIDE_KEY);
            return saved ? parseInt(saved, 10) : 0;
        } catch (error) {
            console.warn('Failed to load current slide:', error);
            return 0;
        }
    }, []);

    const clearStorage = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(SLIDE_KEY);
        } catch (error) {
            console.warn('Failed to clear questionnaire storage:', error);
        }
    }, []);

    return {
        saveResponses,
        loadResponses,
        saveCurrentSlide,
        loadCurrentSlide,
        clearStorage,
    };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
    onNext: () => void,
    onPrevious: () => void,
    canGoNext: boolean,
    canGoPrevious: boolean,
    isSlideComplete: boolean
) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Only handle if not typing in an input
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.key) {
                case 'ArrowRight':
                case 'Enter':
                    if (canGoNext && isSlideComplete) {
                        event.preventDefault();
                        onNext();
                    }
                    break;
                case 'ArrowLeft':
                    if (canGoPrevious) {
                        event.preventDefault();
                        onPrevious();
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNext, onPrevious, canGoNext, canGoPrevious, isSlideComplete]);
}
