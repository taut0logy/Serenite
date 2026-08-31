import type { Phq9Band, Gad7Band } from "./anchors";
import type { BankItem } from "./types";

export type SeverityLevel = "MINIMAL" | "MILD" | "MODERATE" | "SEVERE";

const ORDER: SeverityLevel[] = ["MINIMAL", "MILD", "MODERATE", "SEVERE"];

function toSeverityLevel(band: Phq9Band | Gad7Band): SeverityLevel {
    if (band === "MODERATELY_SEVERE") return "SEVERE";
    return band as SeverityLevel;
}

// overallSeverity comes from the two validated anchors, not a max across
// every domain, so it stays interpretable and varies with actual severity.
export function deriveOverallSeverity(phq9Band: Phq9Band, gad7Band: Gad7Band): SeverityLevel {
    const a = ORDER.indexOf(toSeverityLevel(phq9Band));
    const b = ORDER.indexOf(toSeverityLevel(gad7Band));
    return ORDER[Math.max(a, b)];
}

export interface RiskInput {
    phq9Item9: number;
    freeTextRiskDetected: boolean;
    pcptsd5Raw: number;
    phq9Raw: number;
}

export interface RiskResult {
    riskFlag: boolean;
    riskEscalated: boolean;
}

const PCPTSD5_COMBO_THRESHOLD = 4;
const PHQ9_COMBO_THRESHOLD = 15;

// Used to trigger the crisis panel immediately, at answer time, before the
// item flow continues - not just at final scoring.
export function isSafetyItemEndorsed(item: BankItem, value: number): boolean {
    return item.isSafetyItem && value > 0;
}

// A direct signal (item 9, free-text disclosure) both flags and escalates.
// The PC-PTSD-5 + PHQ-9 combination escalates without needing a direct signal.
export function evaluateRisk(input: RiskInput): RiskResult {
    const directSignal = input.phq9Item9 > 0 || input.freeTextRiskDetected;
    const combinationSignal =
        input.pcptsd5Raw >= PCPTSD5_COMBO_THRESHOLD && input.phq9Raw >= PHQ9_COMBO_THRESHOLD;

    return {
        riskFlag: directSignal,
        riskEscalated: directSignal || combinationSignal,
    };
}
