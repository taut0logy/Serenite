import data from "./resources.json";

/**
 * Crisis resources, from one file.
 *
 * There were two hardcoded lists before this: the questionnaire's panel, which
 * was correct, and the support page's, which was written later from memory and
 * had Kaan Pete Roi's hours wrong. A member reading the second one at 6 AM
 * would have called a line that does not answer until 3 PM.
 *
 * The assistant had a third list, of United States numbers, which would not
 * have connected anyone here at all.
 */

/**
 * What a line is for. Drives the order a member sees, because a general
 * health line must never sit above the suicide-prevention line.
 */
export type CrisisKind = "emergency" | "crisis" | "health";

export interface CrisisResource {
    id: string;
    name: string;
    kind: CrisisKind;
    number: string;
    hours: string;
    /** Answers at any hour. Everything else has a window somebody can fall outside. */
    alwaysOpen: boolean;
    purpose: string;
    source: string;
}

const KIND_ORDER: Record<CrisisKind, number> = { emergency: 0, crisis: 1, health: 2 };

/**
 * Ordered by what a member in trouble needs first: emergency, then the
 * suicide-prevention line, then general health.
 *
 * Deliberately not ordered by opening hours. Sorting always-open lines to the
 * top put a general medical advice number above the only crisis line here,
 * which is the wrong thing to show someone who has just said they want to die.
 *
 * Hours are shown next to every number instead, since the crisis line is the
 * one that closes overnight and a member at 4 AM has to be able to see that
 * rather than ring out.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [...(data.resources as CrisisResource[])].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
);

export const CRISIS_REGION: string = data.region;
export const CRISIS_VERIFIED_ON: string = data.verifiedOn;

/** `tel:` needs digits and a leading plus, nothing else. */
export function dialable(number: string): string {
    return number.replace(/[^0-9+]/g, "");
}
