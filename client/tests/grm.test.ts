import { describe, it, expect } from "vitest";
import { categoryProbabilities, itemInformation } from "@/lib/assessment/grm";

// a=1, b=[-1,1] is symmetric about theta=0, so hand-computable.
const SYMMETRIC = { a: 1, b: [-1, 1] };

describe("categoryProbabilities", () => {
    it("sums to 1 across the plausible theta range", () => {
        for (const theta of [-4, -2, -0.5, 0, 0.5, 2, 4]) {
            const p = categoryProbabilities(theta, SYMMETRIC.a, SYMMETRIC.b);
            expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
        }
    });

    it("matches hand-computed values for a symmetric 3-category item", () => {
        const p = categoryProbabilities(0, SYMMETRIC.a, SYMMETRIC.b);
        expect(p).toHaveLength(3);
        expect(p[0]).toBeCloseTo(0.268941, 5);
        expect(p[1]).toBeCloseTo(0.462117, 5);
        expect(p[2]).toBeCloseTo(0.268941, 5);
    });

    it("shifts mass to higher categories as theta increases", () => {
        const low = categoryProbabilities(-2, SYMMETRIC.a, SYMMETRIC.b);
        const high = categoryProbabilities(2, SYMMETRIC.a, SYMMETRIC.b);
        expect(high[2]).toBeGreaterThan(low[2]);
        expect(high[0]).toBeLessThan(low[0]);
    });
});

describe("itemInformation", () => {
    // A 2-category GRM is the 2PL, whose information is a^2 * P * (1-P).
    // At theta == b, P = 0.5, so information must be a^2 * 0.25.
    it("reduces to the 2PL formula for a dichotomous item", () => {
        expect(itemInformation(0, 1, [0])).toBeCloseTo(0.25, 10);
        expect(itemInformation(0, 2, [0])).toBeCloseTo(1.0, 10);
    });

    it("peaks near the thresholds and decays in the tails", () => {
        const atCentre = itemInformation(0, SYMMETRIC.a, SYMMETRIC.b);
        expect(atCentre).toBeGreaterThan(itemInformation(4, SYMMETRIC.a, SYMMETRIC.b));
        expect(atCentre).toBeGreaterThan(itemInformation(-4, SYMMETRIC.a, SYMMETRIC.b));
    });

    it("is never negative", () => {
        for (const theta of [-4, -1, 0, 1, 4]) {
            expect(itemInformation(theta, SYMMETRIC.a, SYMMETRIC.b)).toBeGreaterThanOrEqual(0);
        }
    });
});
