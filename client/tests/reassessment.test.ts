import { describe, it, expect } from "vitest";
import { isReassessmentDue, computeTrend } from "@/lib/assessment/reassessment";

const DAY = 24 * 60 * 60 * 1000;

describe("isReassessmentDue", () => {
    const now = new Date("2026-08-29T00:00:00Z");

    it("is not due before 2 weeks for a non-escalated user", () => {
        const last = new Date(now.getTime() - 13 * DAY);
        expect(isReassessmentDue(last, false, now)).toBe(false);
    });

    it("is due at 2 weeks for a non-escalated user", () => {
        const last = new Date(now.getTime() - 14 * DAY);
        expect(isReassessmentDue(last, false, now)).toBe(true);
    });

    it("is due at 1 week, not yet at 6 days, for a risk-escalated user", () => {
        const at6days = new Date(now.getTime() - 6 * DAY);
        const at7days = new Date(now.getTime() - 7 * DAY);
        expect(isReassessmentDue(at6days, true, now)).toBe(false);
        expect(isReassessmentDue(at7days, true, now)).toBe(true);
    });

    it("is never due with no prior completed assessment", () => {
        expect(isReassessmentDue(null, false, now)).toBe(false);
    });
});

describe("computeTrend", () => {
    it("marks a domain improved when theta drops meaningfully", () => {
        expect(computeTrend(1.0, 0.5)).toBe("improved");
    });

    it("marks a domain worsened when theta rises meaningfully", () => {
        expect(computeTrend(0.2, 0.8)).toBe("worsened");
    });

    it("marks a domain stable when the change is within the noise band", () => {
        expect(computeTrend(0.5, 0.55)).toBe("stable");
    });

    it("treats a missing previous or current value as stable (nothing to compare)", () => {
        expect(computeTrend(null, 0.5)).toBe("stable");
        expect(computeTrend(0.5, null)).toBe("stable");
    });
});
