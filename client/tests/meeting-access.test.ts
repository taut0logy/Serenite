import { describe, it, expect } from "vitest";
import { EARLY_JOIN_MS, checkJoinAccess, type JoinFacts } from "@/lib/meeting/access";

const NOW = new Date("2026-09-01T18:00:00Z");

const facts = (over: Partial<JoinFacts> = {}): JoinFacts => ({
    isMember: true,
    riskEscalated: false,
    activeElsewhere: false,
    groupNeedsFacilitator: false,
    hasFacilitator: false,
    status: "PENDING",
    startTime: new Date("2026-09-01T18:00:00Z"),
    endTime: new Date("2026-09-01T19:00:00Z"),
    now: NOW,
    ...over,
});

describe("checkJoinAccess", () => {
    it("admits a member inside the window", () => {
        expect(checkJoinAccess(facts())).toBeNull();
    });

    it("refuses a non-member first, so nothing else leaks about the session", () => {
        const result = checkJoinAccess(
            facts({ isMember: false, riskEscalated: true, status: "ENDED" })
        );
        expect(result).toBe("NOT_MEMBER");
    });

    it("holds back an escalated member ahead of any scheduling reason", () => {
        const result = checkJoinAccess(
            facts({ riskEscalated: true, status: "ENDED", activeElsewhere: true })
        );
        expect(result).toBe("RISK_ESCALATED");
    });

    it("will not start a high-severity session with no facilitator", () => {
        const result = checkJoinAccess(facts({ groupNeedsFacilitator: true, hasFacilitator: false }));
        expect(result).toBe("FACILITATOR_REQUIRED");
    });

    it("starts one that has a facilitator", () => {
        const result = checkJoinAccess(facts({ groupNeedsFacilitator: true, hasFacilitator: true }));
        expect(result).toBeNull();
    });

    it("refuses an ended session", () => {
        expect(checkJoinAccess(facts({ status: "ENDED" }))).toBe("MEETING_ENDED");
    });

    it("refuses once the end time has passed, even if the status is stale", () => {
        const result = checkJoinAccess(facts({ now: new Date("2026-09-01T19:00:01Z") }));
        expect(result).toBe("TOO_LATE");
    });

    it("admits inside the early-join window", () => {
        const now = new Date(facts().startTime.getTime() - EARLY_JOIN_MS + 1000);
        expect(checkJoinAccess(facts({ now }))).toBeNull();
    });

    it("refuses before the early-join window opens", () => {
        const now = new Date(facts().startTime.getTime() - EARLY_JOIN_MS - 1000);
        expect(checkJoinAccess(facts({ now }))).toBe("TOO_EARLY");
    });

    it("refuses a member already live in another session", () => {
        expect(checkJoinAccess(facts({ activeElsewhere: true }))).toBe("ALREADY_IN_MEETING");
    });

    it("reports the transient reason last, so a real block is never masked by it", () => {
        const result = checkJoinAccess(facts({ activeElsewhere: true, status: "ENDED" }));
        expect(result).toBe("MEETING_ENDED");
    });
});
