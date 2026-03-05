"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    QuestionnaireIntro,
    QuestionnaireSlide,
    QuestionnaireCompletion,
    QuestionnaireReview,
    QuestionnairePasswordPrompt,
} from "@/components/questionnaire";
import { useQuestionnaireStore } from "@/stores/use-questionnaire-store";
import { useQuestionnaire } from "@/hooks/use-questionnaire";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function QuestionnairePage() {
    const { data: session } = useSession();
    const router = useRouter();

    // Store selectors for optimized re-renders
    const state = useQuestionnaireStore(s => s.state);
    const setState = useQuestionnaireStore(s => s.setState);
    const responses = useQuestionnaireStore(s => s.responses);
    const setResponse = useQuestionnaireStore(s => s.setResponse);
    const questions = useQuestionnaireStore(s => s.questions);
    const hasSavedProgress = useQuestionnaireStore(s => s.hasSavedProgress);
    const getFirstUnansweredIndex = useQuestionnaireStore(s => s.getFirstUnansweredIndex);

    const {
        submitQuestionnaire,
        unlockVault,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        needsUnlock,
    } = useQuestionnaire();

    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [editStartIndex, setEditStartIndex] = useState<number | null>(null);
    const [isEditingFromReview, setIsEditingFromReview] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [state]);

    // Handle password submission — unlocks the encryption vault
    const handlePasswordSubmit = useCallback(async (password: string) => {
        setIsVerifyingPassword(true);
        setPasswordError(null);

        const result = await unlockVault(password);
        setIsVerifyingPassword(false);

        if (!result.success) {
            setPasswordError(result.error || 'Incorrect password');
        }
    }, [unlockVault]);

    const handleSubmit = async () => {
        try {
            const result = await submitQuestionnaire();

            if (result.success) {
                toast.success("Thanks a lot! Let your journey begin.");
                // session.update() was called inside submitQuestionnaire — JWT is now fresh
                // Hard navigate so middleware re-evaluates with updated token
                router.push("/dashboard");
            }
        } catch (error) {
            console.error("Error submitting questionnaire:", error);
            toast.error("Error submitting questionnaire. Please try again.");
        }
    };

    const handleStart = () => {
        setState("progress");
    };

    const handleReview = () => {
        setState("review");
    };

    const handleEditFromReview = (questionIndex: number) => {
        setEditStartIndex(questionIndex);
        setIsEditingFromReview(true);
        setState("progress");
    };

    const handleFinishEditing = () => {
        setIsEditingFromReview(false);
        setState("review");
    };

    const handleBackFromReview = () => {
        setState("completion");
    };

    // Show unlock prompt if vault is locked (page refresh or social login without auto-unlock)
    if (needsUnlock && session?.user) {
        return (
            <QuestionnairePasswordPrompt
                onPasswordSubmit={handlePasswordSubmit}
                isLoading={isVerifyingPassword}
                error={passwordError}
            />
        );
    }

    if (state === "intro") {
        return (
            <QuestionnaireIntro
                onStart={handleStart}
                hasSavedProgress={hasSavedProgress}
                isLoading={isInitialLoading}
                hasInitialized={hasInitialized}
            />
        );
    }

    if (state === "review") {
        return (
            <QuestionnaireReview
                responses={responses}
                onEditAtIndex={handleEditFromReview}
                onBack={handleBackFromReview}
                onSubmit={handleSubmit}
            />
        );
    }

    if (state === "completion") {
        return (
            <QuestionnaireCompletion
                onSubmit={handleSubmit}
                onReview={handleReview}
                isSubmitting={isSubmitting}
            />
        );
    }

    // Progress state - calculate initial index
    const firstUnansweredIndex = getFirstUnansweredIndex();
    const initialIndex = editStartIndex !== null ? editStartIndex : firstUnansweredIndex;

    return (
        <QuestionnaireSlide
            questions={questions}
            responses={responses}
            onResponseChange={(questionId, value) => {
                setResponse(questionId, value);
                // Clear editStartIndex when user makes a change
                if (editStartIndex !== null) {
                    setEditStartIndex(null);
                }
            }}
            initialIndex={initialIndex}
            onComplete={() => setState("completion")}
            onBackToIntro={() => setState("intro")}
            onFinishEditing={isEditingFromReview ? handleFinishEditing : undefined}
        />
    );
}
