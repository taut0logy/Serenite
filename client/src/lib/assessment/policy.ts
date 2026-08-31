// Per-domain administration policy.
//
// Precision is set by the decision a domain supports, not by the domain
// itself. Depression and anxiety produce the PHQ-9 and GAD-7 severity bands
// the product actually shows a user, so they get the high bar - and they
// reach it on their anchor items alone, for free. The other four feed the
// matching vector and, for trauma, a positive/negative screen; none of them
// needs measurement precision the item bank cannot supply anyway.
//
// The previous uniform target of 0.32 was unreachable for the unanchored
// domains: hitting it needs 8 perfectly targeted items and the cap is 8, so
// the precision test could never bind and every one of those domains ran to
// the cap. Splitting the target is what took a sitting from 48 items to 40
// and the cap-hit rate from 52% to 7%.

import type { DomainKey } from "./types";

export interface DomainPolicy {
    /** Standard error at or below which the domain stops. */
    targetSe: number;
    /** Adaptive items always administered before the precision test applies. */
    minAdaptiveItems: number;
    /** Hard ceiling on adaptive items. */
    maxAdaptiveItems: number;
}

/** Marginal reliability 0.90. Reserved for domains that produce a severity band. */
const SE_SEVERITY = 0.32;

/** Marginal reliability 0.80. Sufficient for a matching axis or a screen. */
const SE_MATCHING = 0.45;

const MIN_ADAPTIVE_ITEMS = 4;
const MAX_ADAPTIVE_ITEMS = 8;

function policy(targetSe: number): DomainPolicy {
    return {
        targetSe,
        minAdaptiveItems: MIN_ADAPTIVE_ITEMS,
        maxAdaptiveItems: MAX_ADAPTIVE_ITEMS,
    };
}

export const POLICY_BY_DOMAIN: Record<DomainKey, DomainPolicy> = {
    // Severity bands come from these two, so they keep the high precision bar.
    depression: policy(SE_SEVERITY),
    anxiety: policy(SE_SEVERITY),
    // The PC-PTSD-5 screen comes from the anchors regardless of theta, and the
    // exposure gate already excludes respondents with no index event.
    trauma: policy(SE_MATCHING),
    // Matching axes only.
    sleep: policy(SE_MATCHING),
    social: policy(SE_MATCHING),
    selfWorth: policy(SE_MATCHING),
};
