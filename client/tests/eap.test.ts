import { describe, it, expect } from "vitest";
import { estimateTheta } from "@/lib/assessment/grm";
import type { AdministeredResponse } from "@/lib/assessment/types";

// Five interchangeable 4-category items spanning the usual severity range.
const ITEMS: AdministeredResponse[] = [0, 1, 2, 3, 4].map((i) => ({
    itemId: `i${i}`,
    a: 1.5,
    b: [-1.5, -0.5, 0.5],
    value: 0,
}));

const withValue = (v: number) => ITEMS.map((it) => ({ ...it, value: v }));

describe("estimateTheta", () => {
    it("returns the prior when nothing has been administered", () => {
        const { theta, se } = estimateTheta([]);
        expect(theta).toBeCloseTo(0, 6);
        expect(se).toBeCloseTo(1, 2);
    });

    // Regression for the defect where an asymptomatic respondent was scored
    // MODERATE. MLE diverges on this pattern; EAP must stay finite.
    it("stays finite and low when every item is answered at the minimum", () => {
        const { theta, se } = estimateTheta(withValue(0));
        expect(Number.isFinite(theta)).toBe(true);
        expect(Number.isFinite(se)).toBe(true);
        expect(theta).toBeLessThan(-1);
    });

    it("stays finite and high when every item is answered at the maximum", () => {
        const { theta, se } = estimateTheta(withValue(3));
        expect(Number.isFinite(theta)).toBe(true);
        expect(Number.isFinite(se)).toBe(true);
        expect(theta).toBeGreaterThan(1);
    });

    it("orders respondents by their responses", () => {
        const low = estimateTheta(withValue(0)).theta;
        const mid = estimateTheta(withValue(1)).theta;
        const high = estimateTheta(withValue(3)).theta;
        expect(low).toBeLessThan(mid);
        expect(mid).toBeLessThan(high);
    });

    it("becomes more precise as items accumulate", () => {
        const afterOne = estimateTheta(withValue(2).slice(0, 1)).se;
        const afterFive = estimateTheta(withValue(2)).se;
        expect(afterFive).toBeLessThan(afterOne);
    });
});
