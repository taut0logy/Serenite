import { describe, it, expect } from "vitest";
import {
    MAX_GROUPS_PER_MEMBER,
    checkEligibility,
    explainMatch,
    requiresFacilitator,
    severityRank,
    type GroupFacts,
    type MemberFacts,
} from "@/lib/assessment/eligibility";

const member = (over: Partial<MemberFacts> = {}): MemberFacts => ({
    overallSeverity: "MILD",
    riskEscalated: false,
    groupCount: 0,
    isMember: false,
    ...over,
});

const group = (over: Partial<GroupFacts> = {}): GroupFacts => ({
    minSeverity: "MILD",
    maxSeverity: "SEVERE",
    memberCount: 0,
    maxMembers: 12,
    hasFacilitator: true,
    ...over,
});

describe("severityRank", () => {
    it("orders the bands as the anchors do", () => {
        expect(severityRank("MINIMAL")).toBeLessThan(severityRank("MILD"));
        expect(severityRank("MILD")).toBeLessThan(severityRank("MODERATE"));
        expect(severityRank("MODERATE")).toBeLessThan(severityRank("SEVERE"));
    });
});

describe("requiresFacilitator", () => {
    it("is required once a group's range reaches MODERATE", () => {
        expect(requiresFacilitator({ maxSeverity: "MODERATE" })).toBe(true);
        expect(requiresFacilitator({ maxSeverity: "SEVERE" })).toBe(true);
    });

    it("is not required for a peer-only low-severity group", () => {
        expect(requiresFacilitator({ maxSeverity: "MINIMAL" })).toBe(false);
        expect(requiresFacilitator({ maxSeverity: "MILD" })).toBe(false);
    });
});

describe("checkEligibility", () => {
    it("admits an eligible member", () => {
        expect(checkEligibility(member(), group())).toBeNull();
    });

    it("blocks an escalated member from peer placement", () => {
        expect(checkEligibility(member({ riskEscalated: true }), group())).toBe("RISK_ESCALATED");
    });

    it("reports risk ahead of every more mundane reason", () => {
        // Someone being routed to one-to-one support must not instead be told
        // the group is full, or that they have joined too many.
        const blocked = member({
            riskEscalated: true,
            isMember: true,
            groupCount: MAX_GROUPS_PER_MEMBER,
            overallSeverity: "MINIMAL",
        });
        const full = group({ memberCount: 12, maxMembers: 12, minSeverity: "MODERATE", hasFacilitator: false });
        expect(checkEligibility(blocked, full)).toBe("RISK_ESCALATED");
    });

    it("blocks a member who already belongs to the group", () => {
        expect(checkEligibility(member({ isMember: true }), group())).toBe("ALREADY_MEMBER");
    });

    it("blocks a member at the group cap", () => {
        expect(checkEligibility(member({ groupCount: MAX_GROUPS_PER_MEMBER }), group())).toBe(
            "MAX_GROUPS_REACHED"
        );
    });

    it("blocks a member below the group's band", () => {
        const result = checkEligibility(
            member({ overallSeverity: "MINIMAL" }),
            group({ minSeverity: "MODERATE" })
        );
        expect(result).toBe("SEVERITY_OUT_OF_BAND");
    });

    it("blocks a member above the group's band", () => {
        const result = checkEligibility(
            member({ overallSeverity: "SEVERE" }),
            group({ maxSeverity: "MILD" })
        );
        expect(result).toBe("SEVERITY_OUT_OF_BAND");
    });

    it("admits a member with no assessment, since there is no band to compare", () => {
        expect(checkEligibility(member({ overallSeverity: null }), group())).toBeNull();
    });

    it("refuses to place anyone in an unfacilitated high-severity group", () => {
        const result = checkEligibility(
            member({ overallSeverity: "MODERATE" }),
            group({ minSeverity: "MODERATE", maxSeverity: "SEVERE", hasFacilitator: false })
        );
        expect(result).toBe("FACILITATOR_REQUIRED");
    });

    it("allows an unfacilitated group whose range stays low", () => {
        const result = checkEligibility(
            member({ overallSeverity: "MILD" }),
            group({ minSeverity: "MINIMAL", maxSeverity: "MILD", hasFacilitator: false })
        );
        expect(result).toBeNull();
    });

    it("blocks a full group last, once everything else passes", () => {
        expect(checkEligibility(member(), group({ memberCount: 12, maxMembers: 12 }))).toBe("GROUP_FULL");
    });
});

describe("explainMatch", () => {
    // DOMAIN_ORDER: depression, anxiety, trauma, sleep, social, selfWorth
    it("names the axes where member and group are both elevated", () => {
        const user = [0.2, 0.1, 0, 1.5, 1.2, 0];
        const target = [0.1, 0.2, 0, 1.4, 1.6, 0];
        expect(explainMatch(user, target)).toEqual(["sleep", "social"]);
    });

    it("ignores an axis the group does not target, however elevated the member is", () => {
        const user = [2.5, 0, 0, 1.0, 0, 0];
        const target = [-1.0, 0, 0, 1.2, 0, 0];
        expect(explainMatch(user, target, 1)).toEqual(["sleep"]);
    });

    it("falls back to the closest axes when nothing is jointly elevated", () => {
        const user = [-1.0, -1.2, -0.9, -1.1, -1.4, -1.3];
        const target = [-1.0, -0.2, -0.1, -0.3, -0.4, -0.5];
        expect(explainMatch(user, target, 1)).toEqual(["depression"]);
    });

    it("returns at most the requested number of axes", () => {
        const user = [1, 1, 1, 1, 1, 1];
        const target = [1, 1, 1, 1, 1, 1];
        expect(explainMatch(user, target, 3)).toHaveLength(3);
    });
});
