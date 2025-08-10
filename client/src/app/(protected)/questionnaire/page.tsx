"use client";

import {
    QuestionnaireIntro,
    QuestionnaireSlide,
    QuestionnaireCompletion,
} from "@/components/questionnaire";
import { QuestionnaireReview } from "@/components/questionnaire/questionnaire-review";
import { useQuestionnaireStore } from "@/stores/use-questionnaire-store";
import { useQuestionnaire } from "@/hooks/use-questionnaire";
import { toast } from "sonner";
import { redirectToDashboard } from "@/actions/questionnaire.actions";

export default function QuestionnairePage() {
    const store = useQuestionnaireStore();
    const {
        submitQuestionnaire,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        findFirstIncompleteSlide,
    } = useQuestionnaire();

    // Handle submission
    const handleSubmit = async () => {
        try {
            const result = await submitQuestionnaire();

            if (result.success) {
                toast.info(
                    "Thanks a lot! Let your journey begin."
                );
                await redirectToDashboard();
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

    const handleEditFromReview = (slideIndex: number) => {
        store.setState("progress");
        store.setCurrentSlide(slideIndex);
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
                onEdit={handleEditFromReview}
                onBack={handleBackFromReview}
                onReEdit={handleReEdit}
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

    const currentSlideData = store.slides[store.currentSlide];

    return (
        <QuestionnaireSlide
            questions={currentSlideData.questions}
            responses={store.responses}
            onResponseChange={store.setResponse}
            onNext={handleNext}
            onPrevious={handlePrevious}
            canGoNext={store.canGoNext()}
            canGoPrevious={store.canGoPrevious()}
            currentSlide={store.currentSlide + 1}
            totalSlides={store.totalSlides}
            allPreviousCompleted={store.allPreviousCompleted}
        />
    );
}
