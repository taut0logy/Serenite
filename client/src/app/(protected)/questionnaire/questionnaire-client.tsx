"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { nextStep, recordResponse, recordRiskDisclosure, recordTraumaGate, recordPriorities, undoLast, DOMAIN_ORDER } from "@/lib/assessment/session";
import { isSafetyItemEndorsed } from "@/lib/assessment/scoring";
import { detectRiskDisclosure } from "@/lib/assessment/risk-patterns";
import { SCALES } from "@/lib/assessment/scales";
import { classifyFreeTextResponse } from "@/actions/assessment-llm.actions";
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
    const [isClassifying, setIsClassifying] = useState(false);
    const [unclear, setUnclear] = useState(false);
    const [comparison, setComparison] = useState<AssessmentComparison[] | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [uiState]);

    const step = nextStep(BANKS_BY_DOMAIN, assessmentSession);
    const activeItemId = step.type === "item" ? step.item.id : null;

    // Wall clock from the moment an item is first rendered. Feeds the
    // response-time half of the careless-responding check. Re-presenting the
    // same item after an UNCLEAR does not restart it: the respondent has been
    // looking at that question the whole time.
    const shownAt = useRef<{ itemId: string; at: number } | null>(null);
    if (activeItemId && shownAt.current?.itemId !== activeItemId) {
        shownAt.current = { itemId: activeItemId, at: Date.now() };
    }
    const elapsedMs = () => (shownAt.current ? Date.now() - shownAt.current.at : undefined);

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
    const item = step.item;
    const domain = step.domain;

    const commit = (value: number) => {
        setUnclear(false);
        setSession(
            recordResponse(assessmentSession, domain, {
                itemId: item.id,
                a: item.params.a,
                b: item.params.b,
                value,
                responseTimeMs: elapsedMs(),
            })
        );
        if (isSafetyItemEndorsed(item, value)) setCrisisPanelOpen(true);
    };

    const handleFreeText = async (text: string) => {
        // Runs first, in the browser, on every free-text turn. A disclosure
        // must surface even if the classifier is slow, rate limited or down,
        // so nothing here waits on the network.
        if (detectRiskDisclosure(text)) {
            setSession(recordRiskDisclosure(assessmentSession));
            setCrisisPanelOpen(true);
        }

        setIsClassifying(true);
        try {
            const options = SCALES[item.scaleId].options.map((o) => o.label);
            const res = await classifyFreeTextResponse(text, options);
            // The model may only choose among the item's own options. Anything
            // else re-presents the item verbatim rather than guessing a score.
            if (res.success && typeof res.result === "number") {
                commit(res.result);
            } else {
                setUnclear(true);
            }
        } finally {
            setIsClassifying(false);
        }
    };

    return (
        <QuestionnaireSlide
            item={item}
            domainIndex={domainIndex}
            totalDomains={DOMAIN_ORDER.length}
            canGoBack={assessmentSession.history.length > 0}
            onAnswer={commit}
            onFreeText={handleFreeText}
            isClassifying={isClassifying}
            unclear={unclear}
            onBack={() => {
                setUnclear(false);
                setSession(undoLast(assessmentSession));
            }}
        />
    );
}
