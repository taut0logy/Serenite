// Who may join which group, and why a group was recommended.
//
// Pure functions over plain facts, deliberately free of Prisma. The
// recommendation query and the join transaction both call `checkEligibility`,
// so the list a member sees and the rule the server enforces cannot drift
// apart. They did drift before: the severity check lived only in the
// recommendation query, so a shareable link walked straight past it.

import type { SeverityLevel } from "./scoring";
import { DOMAIN_ORDER } from "./session";
import type { DomainKey } from "./types";

export type IneligibilityReason =
    | "RISK_ESCALATED"
    | "ALREADY_MEMBER"
    | "MAX_GROUPS_REACHED"
    | "SEVERITY_OUT_OF_BAND"
    | "FACILITATOR_REQUIRED"
    | "GROUP_FULL";

export interface MemberFacts {
    /** Anchor-derived band from the latest completed assessment, or null if none. */
    overallSeverity: SeverityLevel | null;
    /** Set when the latest assessment escalated on risk. */
    riskEscalated: boolean;
    /** Groups the member currently belongs to. */
    groupCount: number;
    /** Whether the member already belongs to the group being checked. */
    isMember: boolean;
}

export interface GroupFacts {
    minSeverity: SeverityLevel;
    maxSeverity: SeverityLevel;
    memberCount: number;
    maxMembers: number;
    hasFacilitator: boolean;
}

export const MAX_GROUPS_PER_MEMBER = 3;

const SEVERITY_ORDER: SeverityLevel[] = ["MINIMAL", "MILD", "MODERATE", "SEVERE"];

export function severityRank(level: SeverityLevel): number {
    return SEVERITY_ORDER.indexOf(level);
}

/**
 * A group whose range reaches MODERATE or SEVERE needs a named facilitator.
 * The peer-support literature identifies the unfacilitated high-severity
 * group as the configuration that does harm, so the platform should not be
 * able to produce one by construction.
 */
export function requiresFacilitator(group: Pick<GroupFacts, "maxSeverity">): boolean {
    return severityRank(group.maxSeverity) >= severityRank("MODERATE");
}

/**
 * Returns the first reason this member may not join this group, or null.
 *
 * Order is deliberate. Risk escalation is checked first because it is the one
 * answer that should not be superseded by a more mundane message: someone
 * being routed to one-to-one support must not instead be told the group is
 * full.
 */
export function checkEligibility(member: MemberFacts, group: GroupFacts): IneligibilityReason | null {
    if (member.riskEscalated) return "RISK_ESCALATED";
    if (member.isMember) return "ALREADY_MEMBER";
    if (member.groupCount >= MAX_GROUPS_PER_MEMBER) return "MAX_GROUPS_REACHED";

    if (member.overallSeverity !== null) {
        const rank = severityRank(member.overallSeverity);
        if (rank < severityRank(group.minSeverity)) return "SEVERITY_OUT_OF_BAND";
        if (rank > severityRank(group.maxSeverity)) return "SEVERITY_OUT_OF_BAND";
    }

    if (requiresFacilitator(group) && !group.hasFacilitator) return "FACILITATOR_REQUIRED";
    if (group.memberCount >= group.maxMembers) return "GROUP_FULL";

    return null;
}

/** Wording shown to the member. Kept beside the rules so the two stay in step. */
export const INELIGIBILITY_MESSAGE: Record<IneligibilityReason, string> = {
    RISK_ESCALATED:
        "Based on your last check-in we would rather talk with you one to one first, so group joining is paused for now.",
    ALREADY_MEMBER: "You're already a member of this group.",
    MAX_GROUPS_REACHED: `You've already joined the maximum of ${MAX_GROUPS_PER_MEMBER} groups.`,
    SEVERITY_OUT_OF_BAND: "This group isn't a good fit for where you are right now.",
    FACILITATOR_REQUIRED: "This group is waiting for a facilitator before it can take new members.",
    GROUP_FULL: "This group is full.",
};

/**
 * The domains that make a group a good match, for showing instead of a bare
 * percentage. Ranks axes by shared elevation: the ones where the member and
 * the group are both above the population mean. A percentage derived from
 * provisional parameters implies a precision we do not have; "focuses on
 * sleep and social connection" is both more useful and more honest.
 *
 * Falls back to the closest-matching axes when nothing is jointly elevated,
 * so a low-severity member still gets a reason rather than an empty list.
 */
export function explainMatch(userVector: number[], groupVector: number[], topN = 2): DomainKey[] {
    const shared = DOMAIN_ORDER.map((domain, i) => ({
        domain,
        elevation: Math.min(userVector[i] ?? 0, groupVector[i] ?? 0),
        closeness: -Math.abs((userVector[i] ?? 0) - (groupVector[i] ?? 0)),
    }));

    const elevated = shared.filter((s) => s.elevation > 0).sort((a, b) => b.elevation - a.elevation);
    const ranked = elevated.length > 0 ? elevated : [...shared].sort((a, b) => b.closeness - a.closeness);

    return ranked.slice(0, topN).map((s) => s.domain);
}
