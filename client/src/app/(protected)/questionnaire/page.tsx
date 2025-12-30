"use client";

import { useEffect, useState } from "react";
import {
    QuestionnaireIntro,
    QuestionnaireSlide,
    QuestionnaireCompletion,
    QuestionnaireReview,
} from "@/components/questionnaire";
import { useQuestionnaireStore } from "@/stores/use-questionnaire-store";
import { useQuestionnaire } from "@/hooks/use-questionnaire";
import { useRefreshSession } from "@/lib/session-utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function QuestionnairePage() {
    const store = useQuestionnaireStore();
    const { refreshSession } = useRefreshSession();
    const router = useRouter();
    const {
        submitQuestionnaire,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        findFirstIncompleteSlide,
    } = useQuestionnaire();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [store.state, store.currentSlide]);

    const handleSubmit = async () => {
        try {
            const result = await submitQuestionnaire();

            if (result.success) {
                toast.success("Thanks a lot! Let your journey begin.");

                await refreshSession();

                router.push("/dashboard");

            }
        } catch (error) {
            console.error("Error submitting questionnaire:", error);
            toast.error("Error submitting questionnaire. Please try again.");
        }
    };

    const handleStart = () => {
        store.setState("progress");
    };

    const handleNext = () => {
        if (store.canGoNext()) {
            if (store.currentSlide < store.totalSlides - 1) {
                store.setCurrentSlide(store.currentSlide + 1);
            } else {
                store.setState("completion");
            }
        }
    };

    const handlePrevious = () => {
        if (store.canGoPrevious()) {
            store.setCurrentSlide(store.currentSlide - 1);
        }
    };

    const handleReview = () => {
        store.setState("review");
    };

    const [editStartIndex, setEditStartIndex] = useState<number | null>(null);
    const [isEditingFromReview, setIsEditingFromReview] = useState(false);
    useEffect(() => {
        if (editStartIndex !== null) {
            setEditStartIndex(null);
        }
    }, [editStartIndex]);

    const handleEditFromReview = (questionIndex: number) => {
        setEditStartIndex(questionIndex);
        setIsEditingFromReview(true);
        store.setState("progress");
    };

    const handleFinishEditing = () => {
        setIsEditingFromReview(false);
        store.setState("review");
    };

    const handleBackFromReview = () => {
        store.setState("completion");
    };

    const handleReEdit = () => {
        store.setState("progress");
        const targetSlide = findFirstIncompleteSlide(store.responses);
        store.setCurrentSlide(targetSlide);
    };

    if (store.state === "intro") {
        return (
            <QuestionnaireIntro
                onStart={handleStart}
                hasSavedProgress={store.hasSavedProgress}
                isLoading={isInitialLoading}
                hasInitialized={hasInitialized}
            />
        );
    }

    if (store.state === "review") {
        return (
            <QuestionnaireReview
                responses={store.responses}
                onEditAtIndex={handleEditFromReview}
                onBack={handleBackFromReview}
                onSubmit={handleSubmit}
            />
        );
    }

    if (store.state === "completion") {
        return (
            <QuestionnaireCompletion
                onSubmit={handleSubmit}
                onReview={handleReview}
                isSubmitting={isSubmitting}
            />
        );
    }

    const allQuestions = store.slides.flatMap((slide) => slide.questions);

    const firstIncompleteIndex = allQuestions.findIndex(
        (q) => store.responses[q.id] === undefined
    );

    const calculatedIndex = firstIncompleteIndex === -1
        ? (Object.keys(store.responses).length === allQuestions.length ? allQuestions.length - 1 : 0)
        : firstIncompleteIndex;

    const initialIndex = editStartIndex !== null ? editStartIndex : calculatedIndex;


    return (
        <QuestionnaireSlide
            questions={allQuestions}
            responses={store.responses}
            onResponseChange={store.setResponse}
            onNext={handleNext}
            onPrevious={handlePrevious}
            initialIndex={initialIndex}
            onComplete={() => store.setState("completion")}
            onBackToIntro={() => store.setState("intro")}
            onFinishEditing={isEditingFromReview ? handleFinishEditing : undefined}
        />
    );
}
