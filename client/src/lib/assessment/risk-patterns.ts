// Deterministic risk detection over free text.
//
// Kept in its own module, with no dependencies, so it can run in the browser
// on every free-text turn: no network call, no model, no OpenAI SDK in the
// bundle. That independence is the point. A disclosure must raise the crisis
// panel even when the classification call is slow, rate limited, or down.
//
// Deliberately blunt. This is a floor, not a classifier: it is allowed to
// fire on text that turns out to be benign, and it is not the only safety
// path (PHQ-9 item 9 is administered unconditionally). Missing a disclosure
// costs far more than showing a panel to someone who did not need it.

const RISK_PATTERNS: RegExp[] = [
    /\bkill(ing)? myself\b/i,
    /\bend(ing)? my life\b/i,
    /\bwant(ed)? to die\b/i,
    /\bbetter off dead\b/i,
    /\bsuicid(e|al)\b/i,
    /\b(cutting|hurting) myself\b/i,
    /\bself[- ]harm\b/i,
    /\bdon'?t want to (live|be here) (anymore|any more)\b/i,
];

export function detectRiskDisclosure(text: string): boolean {
    return RISK_PATTERNS.some((pattern) => pattern.test(text));
}
