import { create } from 'zustand';
import { questionnaire } from '@/data/questionnaire';
import type { QuestionnaireResponses, Question } from '@/types/questionnaire';

export type QuestionnaireState = 'intro' | 'progress' | 'review' | 'completion';

// Flatten all questions from the questionnaire
const createQuestions = (): Question[] => {
    return Object.entries(questionnaire.questions).flatMap(([domain, questions]) =>
        (questions as Array<{ id: string; text: string }>).map(q => ({
            ...q,
            domain,
        }))
    );
};

const allQuestions = createQuestions();

interface QuestionnaireStore {
    // State
    state: QuestionnaireState;
    responses: QuestionnaireResponses;
    isLoading: boolean;
    isSubmitting: boolean;

    // Static data
    questions: Question[];
    totalQuestions: number;

    // Computed getters
    hasSavedProgress: boolean;

    // Actions
    setState: (state: QuestionnaireState) => void;
    setResponse: (questionId: string, value: number) => void;
    setResponses: (responses: QuestionnaireResponses) => void;
    setIsLoading: (loading: boolean) => void;
    setIsSubmitting: (submitting: boolean) => void;

    // Helpers
    isQuestionAnswered: (questionId: string) => boolean;
    isQuestionnaireComplete: () => boolean;
    getFirstUnansweredIndex: () => number;

    // Reset
    reset: () => void;
}

export const useQuestionnaireStore = create<QuestionnaireStore>((set, get) => ({
    // Initial state
    state: 'intro',
    responses: {},
    isLoading: false,
    isSubmitting: false,

    // Static data
    questions: allQuestions,
    totalQuestions: allQuestions.length,

    // Computed getters
    get hasSavedProgress() {
        const state = get();
        return Object.keys(state.responses).length > 0;
    },

    // Actions
    setState: (state) => set({ state }),

    setResponse: (questionId, value) =>
        set((state) => ({
            responses: { ...state.responses, [questionId]: value }
        })),

    setResponses: (responses) => set({ responses }),

    setIsLoading: (loading) => set({ isLoading: loading }),

    setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),

    // Helpers
    isQuestionAnswered: (questionId) => {
        const state = get();
        return state.responses[questionId] !== undefined;
    },

    isQuestionnaireComplete: () => {
        const state = get();
        return state.questions.every(q => state.responses[q.id] !== undefined);
    },

    getFirstUnansweredIndex: () => {
        const state = get();
        const index = state.questions.findIndex(q => state.responses[q.id] === undefined);
        return index === -1 ? state.questions.length - 1 : index;
    },

    // Reset
    reset: () => {
        set({
            state: 'intro',
            responses: {},
            isLoading: false,
            isSubmitting: false,
        });
    },
}));
