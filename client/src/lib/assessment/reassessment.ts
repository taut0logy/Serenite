const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_DAYS = 14;
const ESCALATED_INTERVAL_DAYS = 7;

// PHQ-9/GAD-7 both ask about "the past 2 weeks" - a 2-week cadence means
// each re-assessment covers a fresh window instead of re-surveying one the
// last assessment already covered.
export function isReassessmentDue(
    lastCompletedAt: Date | null,
    wasRiskEscalated: boolean,
    now: Date
): boolean {
    if (!lastCompletedAt) return false;
    const intervalDays = wasRiskEscalated ? ESCALATED_INTERVAL_DAYS : DEFAULT_INTERVAL_DAYS;
    const dueAt = lastCompletedAt.getTime() + intervalDays * DAY_MS;
    return now.getTime() >= dueAt;
}

export type TrendVerdict = "improved" | "worsened" | "stable";

// Provisional fixed threshold, not derived from the EAP standard errors
// that are actually available - fine for a first pass, worth revisiting
// with a proper "was this change meaningful" test later.
const STABLE_BAND = 0.3;

// Lower theta = less symptomatic, so a drop is an improvement.
export function computeTrend(previous: number | null, current: number | null): TrendVerdict {
    if (previous === null || current === null) return "stable";
    const diff = current - previous;
    if (diff <= -STABLE_BAND) return "improved";
    if (diff >= STABLE_BAND) return "worsened";
    return "stable";
}
