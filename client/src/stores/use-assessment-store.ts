import { create } from "zustand";
import { createSession, type SessionState } from "@/lib/assessment/session";

export type AssessmentUIState = "intro" | "progress" | "review" | "completion" | "results";

interface AssessmentStore {
    uiState: AssessmentUIState;
    session: SessionState;
    isLoading: boolean;
    isSubmitting: boolean;
    // Lives here rather than in component state so it survives a remount of
    // the questionnaire page (observed around the post-submit navigation)
    // instead of triggering a redundant load.
    hasInitialized: boolean;
    // Non-dismissible; blocks every other screen until acknowledged.
    crisisPanelOpen: boolean;

    setUIState: (state: AssessmentUIState) => void;
    setSession: (session: SessionState) => void;
    setIsLoading: (loading: boolean) => void;
    setIsSubmitting: (submitting: boolean) => void;
    setHasInitialized: (initialized: boolean) => void;
    setCrisisPanelOpen: (open: boolean) => void;
    hasSavedProgress: () => boolean;
    reset: () => void;
}

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
    uiState: "intro",
    session: createSession(),
    isLoading: false,
    isSubmitting: false,
    hasInitialized: false,
    crisisPanelOpen: false,

    setUIState: (uiState) => set({ uiState }),
    setSession: (session) => set({ session }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
    setHasInitialized: (hasInitialized) => set({ hasInitialized }),
    setCrisisPanelOpen: (crisisPanelOpen) => set({ crisisPanelOpen }),

    hasSavedProgress: () => {
        const { session } = get();
        return session.history.length > 0;
    },

    reset: () =>
        set({
            uiState: "intro",
            session: createSession(),
            isLoading: false,
            isSubmitting: false,
            hasInitialized: false,
        }),
}));
