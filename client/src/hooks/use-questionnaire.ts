'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { saveQuestionnaireProgress, getQuestionnaireProgress, completeQuestionnaire } from '@/actions/questionnaire.actions';
import { useQuestionnaireStore } from '@/stores/use-questionnaire-store';
import { QuestionnaireResponses } from '@/types/questionnaire';

export function useQuestionnaire() {
    const { data: session } = useSession();
    const store = useQuestionnaireStore();
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Helper function to find the first slide with unanswered questions
    const findFirstIncompleteSlide = useCallback((responses: QuestionnaireResponses) => {
        const slides = store.slides;

        for (let i = 0; i < slides.length; i++) {
            const slideQuestions = slides[i].questions;
            const hasUnansweredQuestions = slideQuestions.some(q => responses[q.id] === undefined);

            if (hasUnansweredQuestions) {
                return i;
            }
        }

        // If all slides are complete, return the last slide
        return slides.length - 1;
    }, [store.slides]);

    // Auto-save to database with debouncing
    const saveToDatabase = useCallback(async (responses: QuestionnaireResponses) => {
        if (!session?.user || Object.keys(responses).length === 0) {
            return { success: false, error: 'User not authenticated or no responses' };
        }

        try {
            const result = await saveQuestionnaireProgress(responses);
            return result;
        } catch (error) {
            console.error('Failed to save to database:', error);
            return { success: false, error: 'Failed to save to database' };
        }
    }, [session]);

    // Load progress from database
    const loadFromDatabase = useCallback(async () => {
        if (!session?.user) {
            return { success: false, error: 'User not authenticated' };
        }

        console.log('Loading questionnaire progress from database...');
        try {
            const result = await getQuestionnaireProgress();
            console.log('Database result:', result);

            if (result.success && result.data) {
                console.log('Setting responses in store:', result.data);
                store.setResponses(result.data);

                // Find the first slide with unanswered questions
                const targetSlide = findFirstIncompleteSlide(result.data);

                console.log(`Setting current slide to ${targetSlide} (first slide with unanswered questions)`);
                store.setCurrentSlide(targetSlide);

                return { success: true, data: result.data };
            } else {
                // No saved progress or error - start fresh
                store.setResponses({});
                store.setCurrentSlide(0);
                return { success: true, data: null };
            }
        } catch (error) {
            console.error('Failed to load from database:', error);
            // On error, start fresh
            store.setResponses({});
            store.setCurrentSlide(0);
            return { success: false, error: 'Failed to load from database' };
        }
    }, [session, store, findFirstIncompleteSlide]);

    // Complete questionnaire
    const submitQuestionnaire = useCallback(async () => {
        if (!session?.user) {
            throw new Error('User not authenticated');
        }

        store.setIsSubmitting(true);
        try {
            const result = await completeQuestionnaire(store.responses);
            if (result.success) {
                store.setResponses({});
                store.setState('intro');
                store.setCurrentSlide(0);
                return result;
            } else {
                console.error('Failed to complete questionnaire:', result.error);
                throw new Error(result.error || 'Failed to complete questionnaire');
            }
        } finally {
            store.setIsSubmitting(false);
        }
    }, [session, store]);

    // Initialize: Load from database when session is ready
    useEffect(() => {
        if (!session?.user || hasInitialized) return;

        console.log('Initializing questionnaire - loading from database...');
        setIsInitialLoading(true);

        loadFromDatabase().finally(() => {
            setIsInitialLoading(false);
            setHasInitialized(true);
        });
    }, [session, hasInitialized, loadFromDatabase]);

    // Auto-save responses to database when they change (only after initialization)
    useEffect(() => {
        if (!session?.user || !hasInitialized || Object.keys(store.responses).length === 0) return;

        const timeoutId = setTimeout(async () => {
            await saveToDatabase(store.responses);
        }, 2000); // Save to database 2 seconds after last change

        return () => clearTimeout(timeoutId);
    }, [store.responses, session, saveToDatabase, hasInitialized]);

    // Auto-save when current slide changes (only after initialization)
    useEffect(() => {
        if (!session?.user || !hasInitialized || Object.keys(store.responses).length === 0) return;

        const timeoutId = setTimeout(async () => {
            await saveToDatabase(store.responses);
        }, 1000); // Save to database 1 second after slide change

        return () => clearTimeout(timeoutId);
    }, [store.currentSlide, session, saveToDatabase, store.responses, hasInitialized]);

    return {
        saveToDatabase,
        loadFromDatabase,
        submitQuestionnaire,
        isLoading: store.isLoading,
        isSubmitting: store.isSubmitting,
        isInitialLoading,
        hasInitialized,
        findFirstIncompleteSlide,
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
