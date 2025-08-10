import { create } from 'zustand';
import { questionnaire } from '@/data/questionnaire';
import type { QuestionnaireResponses } from '@/types/questionnaire';

export type QuestionnaireState = 'intro' | 'progress' | 'review' | 'completion';

interface QuestionnaireStore {
    // State
    state: QuestionnaireState;
    currentSlide: number;
    responses: QuestionnaireResponses;
    isLoading: boolean;
    isSubmitting: boolean;

    // Computed values
    totalSlides: number;
    slides: Array<{ domain: string; questions: Array<{ id: string; domain: string; text: string }> }>;

    // Computed getters for saved progress
    hasSavedProgress: boolean;
    allPreviousCompleted: boolean;

    // Actions
    setState: (state: QuestionnaireState) => void;
    setCurrentSlide: (slide: number) => void;
    setResponse: (questionId: string, value: number) => void;
    setResponses: (responses: QuestionnaireResponses) => void;
    setIsLoading: (loading: boolean) => void;
    setIsSubmitting: (submitting: boolean) => void;

    // Navigation helpers
    canGoToSlide: (slideIndex: number) => boolean;
    canGoNext: () => boolean;
    canGoPrevious: () => boolean;
    isSlideComplete: (slideIndex: number) => boolean;
    isAllPreviousSlidesComplete: (slideIndex: number) => boolean;
    isLastSlide: () => boolean;
    isQuestionnaireComplete: () => boolean;

    // Navigation actions
    goToSlide: (slideIndex: number) => void;
    goNext: () => void;
    goPrevious: () => void;
    goToReview: () => void;
    backFromReview: () => void;

    // Reset
    reset: () => void;
}

// Convert questionnaire data to slides
const createSlides = () => {
    return Object.entries(questionnaire.questions).map(([key, questions]) => ({
        domain: key,
        questions: questions as Array<{ id: string; domain: string; text: string }>
    }));
};

const slides = createSlides();
const totalSlides = slides.length;

export const useQuestionnaireStore = create<QuestionnaireStore>((set, get) => ({
    // Initial state
    state: 'intro',
    currentSlide: 0,
    responses: {},
    isLoading: false,
    isSubmitting: false,
    totalSlides,
    slides,

    // Computed getters
    get hasSavedProgress() {
        const state = get();
        return Object.keys(state.responses).length > 0;
    },

    get allPreviousCompleted() {
        const state = get();
        return state.isAllPreviousSlidesComplete(state.currentSlide);
    },

    // Actions
    setState: (state) => set({ state }),

    setCurrentSlide: (slide) => set({ currentSlide: slide }),

    setResponse: (questionId, value) =>
        set((state) => ({
            responses: { ...state.responses, [questionId]: value }
        })),

    setResponses: (responses) => set({ responses }),

    setIsLoading: (loading) => set({ isLoading: loading }),

    setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),

    // Navigation helpers
    canGoToSlide: (slideIndex) => {
        const state = get();
        return state.isAllPreviousSlidesComplete(slideIndex);
    },

    canGoNext: () => {
        const state = get();
        const currentSlideComplete = state.isSlideComplete(state.currentSlide);
        const allPreviousComplete = state.isAllPreviousSlidesComplete(state.currentSlide);
        const isLast = state.isLastSlide();

        // Can go next if current slide is complete AND (all previous complete OR it's the last slide)
        return currentSlideComplete && (allPreviousComplete || isLast);
    },

    canGoPrevious: () => {
        const state = get();
        return state.currentSlide > 0;
    },

    isSlideComplete: (slideIndex) => {
        const state = get();
        const slide = state.slides[slideIndex];
        if (!slide) return false;

        return slide.questions.every(q => state.responses[q.id] !== undefined);
    },

    isAllPreviousSlidesComplete: (slideIndex) => {
        const state = get();
        for (let i = 0; i < slideIndex; i++) {
            if (!state.isSlideComplete(i)) {
                return false;
            }
        }
        return true;
    },

    isLastSlide: () => {
        const state = get();
        return state.currentSlide === state.totalSlides - 1;
    },

    isQuestionnaireComplete: () => {
        const state = get();
        return state.slides.every((_, index) => state.isSlideComplete(index));
    },

    // Navigation actions
    goToSlide: (slideIndex) => {
        const state = get();
        if (state.canGoToSlide(slideIndex)) {
            set({ currentSlide: slideIndex, state: 'progress' });
        }
    },

    goNext: () => {
        const state = get();
        if (!state.canGoNext()) return;

        if (state.isLastSlide()) {
            // Go to review after completing last slide
            set({ state: 'review' });
        } else {
            // Go to next slide
            set({ currentSlide: state.currentSlide + 1 });
        }
    },

    goPrevious: () => {
        const state = get();
        if (state.canGoPrevious()) {
            set({ currentSlide: state.currentSlide - 1 });
        }
    },

    goToReview: () => {
        set({ state: 'review' });
    },

    backFromReview: () => {
        const state = get();
        // When going back from review, go to the last slide (or furthest accessible slide)
        let targetSlide = state.totalSlides - 1;

        // Find the furthest accessible slide
        for (let i = state.totalSlides - 1; i >= 0; i--) {
            if (state.canGoToSlide(i)) {
                targetSlide = i;
                break;
            }
        }

        set({
            state: 'progress',
            currentSlide: targetSlide
        });
    },

    // Reset
    reset: () => {
        set({
            state: 'intro',
            currentSlide: 0,
            responses: {},
            isLoading: false,
            isSubmitting: false,
        });
    },
}));
