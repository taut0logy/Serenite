import { describe, it, expect } from "vitest";
import { computeCentroid, computeMatchScore, blendGroupProfile } from "@/lib/assessment/group-matching";

describe("computeCentroid", () => {
    it("averages each dimension across vectors", () => {
        expect(computeCentroid([
            [0, 2, 4],
            [2, 4, 6],
        ])).toEqual([1, 3, 5]);
    });

    it("returns the single vector unchanged for one member", () => {
        expect(computeCentroid([[1, -1, 0.5]])).toEqual([1, -1, 0.5]);
    });

    it("returns null for no vectors", () => {
        expect(computeCentroid([])).toBeNull();
    });
});

describe("computeMatchScore", () => {
    it("scores an exact match at 100", () => {
        expect(computeMatchScore([1, -1, 0], [1, -1, 0])).toBe(100);
    });

    it("scores a large mismatch far below 100", () => {
        const close = computeMatchScore([0, 0, 0], [0.2, -0.1, 0.1]);
        const far = computeMatchScore([0, 0, 0], [3, -3, 3]);
        expect(far).toBeLessThan(close);
    });

    it("never returns a saturated near-100 score for a real mismatch", () => {
        // The defect being fixed: cosine similarity over non-negative axes
        // put unrelated profiles at 90%+ just because they pointed the same
        // general direction. A magnitude-sensitive score must not do that.
        const score = computeMatchScore([0.2, 0.2, 0.2, 0.2, 0.2, 0.2], [1, 1, 1, 1, 1, 1]);
        expect(score).toBeLessThan(80);
    });

    it("stays within 0-100", () => {
        expect(computeMatchScore([-4, -4, -4], [4, 4, 4])).toBeGreaterThanOrEqual(0);
        expect(computeMatchScore([-4, -4, -4], [4, 4, 4])).toBeLessThanOrEqual(100);
    });
});

describe("blendGroupProfile", () => {
    it("is pure seed when the group has no members yet", () => {
        expect(blendGroupProfile([1, 2], null, 0)).toEqual([1, 2]);
    });

    it("shifts toward the centroid as membership grows", () => {
        const seed = [0, 0];
        const centroid = [4, 4];
        const early = blendGroupProfile(seed, centroid, 1);
        const later = blendGroupProfile(seed, centroid, 4);
        expect(later[0]).toBeGreaterThan(early[0]);
    });

    it("is the full centroid once membership reaches the weighting threshold", () => {
        expect(blendGroupProfile([0, 0], [3, -3], 5)).toEqual([3, -3]);
        expect(blendGroupProfile([0, 0], [3, -3], 20)).toEqual([3, -3]);
    });
});
