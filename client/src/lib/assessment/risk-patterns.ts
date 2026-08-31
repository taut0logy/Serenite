import data from "@/lib/crisis/resources.json";

// Deterministic risk detection over free text.
//
// No dependencies beyond the data file, so it runs in the browser on every
// free-text turn: no network call, no model, no OpenAI SDK in the bundle.
// That independence is the point. A disclosure must raise the crisis panel
// even when the classification call is slow, rate limited, or down.
//
// The patterns live in lib/crisis/resources.json alongside the crisis numbers,
// because the AI service needs the same set and a second copy would drift.
// Both use them, and a test fails if the two files stop matching.
//
// Deliberately blunt. This is a floor, not a classifier: it is allowed to fire
// on text that turns out to be benign, and it is not the only safety path
// (PHQ-9 item 9 is administered unconditionally). Missing a disclosure costs
// far more than showing a panel to someone who did not need it.

const RISK_PATTERNS: RegExp[] = data.riskPatterns.map(
    (pattern) => new RegExp(pattern, "i")
);

export function detectRiskDisclosure(text: string): boolean {
    return RISK_PATTERNS.some((pattern) => pattern.test(text));
}
