import { scorePHQ9, scoreGAD7, scorePCPTSD5 } from "./anchors";
import { deriveOverallSeverity, evaluateRisk, type SeverityLevel } from "./scoring";
import { computeQuality } from "./quality";
import { DOMAIN_ORDER, finalizeThetas, type PriorityKey, type SessionState } from "./session";
import type { BankItem, DomainKey, ThetaEstimate } from "./types";

export interface FinalAssessmentResult {
    parameterSetId: string;
    thetas: Partial<Record<DomainKey, ThetaEstimate>>;
    phq9Raw: number;
    gad7Raw: number;
    pcptsd5Raw: number;
    traumaExposed: boolean;
    overallSeverity: SeverityLevel;
    priorities: PriorityKey[];
    riskFlag: boolean;
    riskEscalated: boolean;
    qualityFlagged: boolean;
}

function anchorRawValues(
    banks: Record<DomainKey, BankItem[]>,
    session: SessionState,
    domain: DomainKey,
    provenance: BankItem["provenance"]
): number[] {
    const bank = banks[domain];
    const administered = session.responses[domain] ?? [];
    return administered
        .filter((r) => bank.find((i) => i.id === r.itemId)?.provenance === provenance)
        .map((r) => r.value);
}

export interface AssembleInput {
    banks: Record<DomainKey, BankItem[]>;
    session: SessionState;
    parameterSetId: string;
}

export function assembleResult(input: AssembleInput): FinalAssessmentResult {
    const { banks, session, parameterSetId } = input;

    // Both signals are read off the session rather than passed in, so a caller
    // cannot forget to forward them. That is exactly how they were lost before:
    // the hook hardcoded `false` for each and the detectors ran nowhere.
    const freeTextRiskDetected = session.riskDetected;
    const allResponses = DOMAIN_ORDER.flatMap((d) => session.responses[d] ?? []);
    const qualityFlagged = computeQuality(allResponses).flagged;

    const phq9 = scorePHQ9(anchorRawValues(banks, session, "depression", "PHQ9"));
    const gad7 = scoreGAD7(anchorRawValues(banks, session, "anxiety", "GAD7"));
    const pcptsd5 = scorePCPTSD5(anchorRawValues(banks, session, "trauma", "PCPTSD5"));

    const safetyItem = banks.depression.find((i) => i.isSafetyItem);
    const safetyResponse = (session.responses.depression ?? []).find((r) => r.itemId === safetyItem?.id);
    const phq9Item9 = safetyResponse?.value ?? 0;

    const risk = evaluateRisk({
        phq9Item9,
        freeTextRiskDetected,
        pcptsd5Raw: pcptsd5.raw,
        phq9Raw: phq9.raw,
    });

    return {
        parameterSetId,
        thetas: finalizeThetas(session),
        phq9Raw: phq9.raw,
        gad7Raw: gad7.raw,
        pcptsd5Raw: pcptsd5.raw,
        traumaExposed: session.traumaExposed,
        overallSeverity: deriveOverallSeverity(phq9.band, gad7.band),
        priorities: session.priorities ?? [],
        riskFlag: risk.riskFlag,
        riskEscalated: risk.riskEscalated,
        qualityFlagged,
    };
}
