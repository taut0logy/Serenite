"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    QuestionnaireIntro,
    QuestionnaireSlide,
    QuestionnaireCompletion,
    QuestionnaireReview,
    QuestionnairePasswordPrompt,
    TraumaGatePrompt,
    PrioritiesRanking,
    CrisisPanel,
    AssessmentResults,
} from "@/components/questionnaire";
import { useAssessmentStore } from "@/stores/use-assessment-store";
import { useAssessment } from "@/hooks/use-assessment";
import { BANKS_BY_DOMAIN } from "@/lib/assessment/banks";
import { nextStep, recordResponse, recordTraumaGate, recordPriorities, undoLast, DOMAIN_ORDER } from "@/lib/assessment/session";
import { isSafetyItemEndorsed } from "@/lib/assessment/scoring";
import { getTransitionMessage } from "@/actions/assessment-llm.actions";
import { getAssessmentComparison, type AssessmentComparison } from "@/actions/assessment.actions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export function QuestionnaireClient() {
    const { data: session } = useSession();
    const router = useRouter();

    const uiState = useAssessmentStore(s => s.uiState);
    const setUIState = useAssessmentStore(s => s.setUIState);
    const assessmentSession = useAssessmentStore(s => s.session);
    const setSession = useAssessmentStore(s => s.setSession);
    const hasSavedProgress = useAssessmentStore(s => s.hasSavedProgress());
    const crisisPanelOpen = useAssessmentStore(s => s.crisisPanelOpen);
    const setCrisisPanelOpen = useAssessmentStore(s => s.setCrisisPanelOpen);

    const {
        submitAssessment,
        unlockVault,
        isSubmitting,
        isInitialLoading,
        hasInitialized,
        needsUnlock,
    } = useAssessment();

    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [transitionMessage, setTransitionMessage] = useState<string | undefined>();
    const [comparison, setComparison] = useState<AssessmentComparison[] | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [uiState]);

    const step = nextStep(BANKS_BY_DOMAIN, assessmentSession);

    // Fetch a short transition line whenever the active domain changes.
    // Best-effort: the slide renders fine with no message if this fails.
    useEffect(() => {
        if (step.type !== "item") {
            setTransitionMessage(undefined);
            return;
        }
        const domainIndex = DOMAIN_ORDER.indexOf(step.domain);
        const isFirstOfDomain = (assessmentSession.responses[step.domain]?.length ?? 0) === 0;
        if (!isFirstOfDomain) return;

        getTransitionMessage({
            previousDomain: domainIndex > 0 ? DOMAIN_ORDER[domainIndex - 1] : undefined,
            nextDomain: step.domain,
            isFirst: domainIndex === 0,
        }).then((res) => {
            if (res.success) setTransitionMessage(res.text);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step.type === "item" ? step.domain : null]);

    const handlePasswordSubmit = useCallback(async (password: string) => {
        setIsVerifyingPassword(true);
        setPasswordError(null);
        const result = await unlockVault(password);
        setIsVerifyingPassword(false);
        if (!result.success) setPasswordError(result.error || "Incorrect password");
    }, [unlockVault]);

    const handleSubmit = async () => {
        try {
            const result = await submitAssessment();
            if (result.success) {
                toast.success("Thanks a lot! Let your journey begin.");
                const comparisonResult = await getAssessmentComparison();
                if (comparisonResult.success && comparisonResult.comparison) {
                    setComparison(comparisonResult.comparison);
                    setUIState("results");
                } else {
                    router.push("/dashboard");
                }
            }
        } catch (error) {
            console.error("Error submitting assessment:", error);
            toast.error("Error submitting assessment. Please try again.");
        }
    };

    if (needsUnlock && session?.user) {
        return (
            <QuestionnairePasswordPrompt
                onPasswordSubmit={handlePasswordSubmit}
                isLoading={isVerifyingPassword}
                error={passwordError}
            />
        );
    }

    // Interrupts everything else until acknowledged - never dismissed by a
    // route change, back button, or navigating elsewhere in the flow.
    if (crisisPanelOpen) {
        return <CrisisPanel onAcknowledge={() => setCrisisPanelOpen(false)} />;
    }

    if (uiState === "intro") {
        return (
            <QuestionnaireIntro
                onStart={() => setUIState("progress")}
                hasSavedProgress={hasSavedProgress}
                isLoading={isInitialLoading}
                hasInitialized={hasInitialized}
            />
        );
    }

    if (uiState === "review") {
        return (
            <QuestionnaireReview
                session={assessmentSession}
                onBack={() => setUIState("completion")}
                onSubmit={handleSubmit}
            />
        );
    }

    if (uiState === "results" && comparison) {
        return (
            <AssessmentResults
                comparison={comparison}
                onContinue={() => router.push("/dashboard")}
            />
        );
    }

    if (uiState === "completion") {
        return (
            <QuestionnaireCompletion
                onSubmit={handleSubmit}
                onReview={() => setUIState("review")}
                isSubmitting={isSubmitting}
            />
        );
    }

    // uiState === "progress"
    if (step.type === "traumaGate") {
        return (
            <TraumaGatePrompt
                onAnswer={(exposed) => setSession(recordTraumaGate(assessmentSession, exposed))}
            />
        );
    }

    if (step.type === "priorities") {
        return (
            <PrioritiesRanking
                onSubmit={(ranking) => {
                    setSession(recordPriorities(assessmentSession, ranking));
                    setUIState("completion");
                }}
            />
        );
    }

    if (step.type === "done") {
        setUIState("completion");
        return null;
    }

    const domainIndex = DOMAIN_ORDER.indexOf(step.domain);

    return (
        <QuestionnaireSlide
            item={step.item}
            domainIndex={domainIndex}
            totalDomains={DOMAIN_ORDER.length}
            transitionMessage={transitionMessage}
            canGoBack={assessmentSession.history.length > 0}
            onAnswer={(value) => {
                setSession(
                    recordResponse(assessmentSession, step.domain, {
                        itemId: step.item.id,
                        a: step.item.params.a,
                        b: step.item.params.b,
                        value,
                    })
                );
                if (isSafetyItemEndorsed(step.item, value)) setCrisisPanelOpen(true);
            }}
            onBack={() => setSession(undoLast(assessmentSession))}
        />
    );
}
