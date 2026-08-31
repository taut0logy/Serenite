// Careless-responding signals, computed on the client alongside the profile.
//
// A flagged profile is marked, not discarded, and never blocks anyone from
// finishing: detecting careless responding is preferable to preventing it by
// distorting the instrument. The flag's real consumer is the calibration
// pool, which must not be fed by straight-lined sittings.
//
// Both thresholds are provisional and documented as such. Person-fit, the
// principled third signal, needs empirical item parameters and is therefore
// omitted until calibration has run.

import type { AdministeredResponse } from "./types";

export interface QualitySignals {
    /** Longest run of identical consecutive responses. */
    longestRun: number;
    /** Median time spent per item, or null when no timings were captured. */
    medianResponseMs: number | null;
    flagged: boolean;
}

/**
 * A run this long is implausible across items that deliberately vary in
 * content and difficulty. Set above the longest legitimate run seen in the
 * banks (a genuinely asymptomatic respondent answering a single domain at
 * floor), so a real zero profile is not flagged.
 */
const LONG_STRING_THRESHOLD = 10;

/** Below this, an answer was not read. Reading the shortest item takes longer. */
const MIN_MEDIAN_RESPONSE_MS = 800;

function median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function longestIdenticalRun(responses: AdministeredResponse[]): number {
    let longest = 0;
    let current = 0;
    let previous: number | null = null;

    for (const response of responses) {
        current = response.value === previous ? current + 1 : 1;
        previous = response.value;
        if (current > longest) longest = current;
    }

    return longest;
}

export function computeQuality(responses: AdministeredResponse[]): QualitySignals {
    const longestRun = longestIdenticalRun(responses);
    const timings = responses
        .map((r) => r.responseTimeMs)
        .filter((ms): ms is number => typeof ms === "number");
    const medianResponseMs = median(timings);

    const tooFast = medianResponseMs !== null && medianResponseMs < MIN_MEDIAN_RESPONSE_MS;
    const straightLined = longestRun >= LONG_STRING_THRESHOLD;

    return { longestRun, medianResponseMs, flagged: tooFast || straightLined };
}
