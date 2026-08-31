import { depressionBank } from "./depression";
import { anxietyBank } from "./anxiety";
import { traumaBank } from "./trauma";
import { sleepBank } from "./sleep";
import { socialBank } from "./social";
import { selfWorthBank } from "./self-worth";
import type { BankItem, DomainKey } from "../types";

export const BANKS_BY_DOMAIN: Record<DomainKey, BankItem[]> = {
    depression: depressionBank,
    anxiety: anxietyBank,
    trauma: traumaBank,
    sleep: sleepBank,
    social: socialBank,
    selfWorth: selfWorthBank,
};

export const ALL_BANKS: BankItem[] = Object.values(BANKS_BY_DOMAIN).flat();

export { TRAUMA_EXPOSURE_GATE } from "./trauma";

// Identifies the provisional parameter set these banks ship with. Bump this
// whenever thresholds change so old Assessment rows stay attributable to the
// metric they were actually scored on.
export const PARAMETER_SET_ID = "ps-2026-08-provisional-1";
