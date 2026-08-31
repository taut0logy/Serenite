import { describe, it, expect } from "vitest";
import { computeQuality, longestIdenticalRun } from "@/lib/assessment/quality";
import type { AdministeredResponse } from "@/lib/assessment/types";

function response(value: number, responseTimeMs?: number): AdministeredResponse {
    return { itemId: `i${Math.random()}`, a: 2, b: [-1, 0, 1], value, responseTimeMs };
}

function run(values: number[], ms?: number): AdministeredResponse[] {
    return values.map((v) => response(v, ms));
}

describe("longestIdenticalRun", () => {
    it("is zero for no responses", () => {
        expect(longestIdenticalRun([])).toBe(0);
    });

    it("counts the longest consecutive run, not the total per value", () => {
        expect(longestIdenticalRun(run([1, 1, 1, 2, 1, 1]))).toBe(3);
    });

    it("counts a single response as a run of one", () => {
        expect(longestIdenticalRun(run([2]))).toBe(1);
    });
});

describe("computeQuality", () => {
    it("flags a straight-lined sitting", () => {
        expect(computeQuality(run(Array(12).fill(0), 4000)).flagged).toBe(true);
    });

    it("does not flag a run just under the threshold", () => {
        const responses = [...run(Array(9).fill(0), 4000), ...run([1, 2, 3], 4000)];
        expect(computeQuality(responses).flagged).toBe(false);
    });

    it("flags implausibly fast answering even when responses vary", () => {
        expect(computeQuality(run([0, 1, 2, 3, 0, 1], 200)).flagged).toBe(true);
    });

    it("does not flag a varied sitting answered at a normal pace", () => {
        const result = computeQuality(run([0, 2, 1, 3, 1, 0], 3500));
        expect(result.flagged).toBe(false);
        expect(result.medianResponseMs).toBe(3500);
    });

    it("reports no median and does not flag when timings were never captured", () => {
        const result = computeQuality(run([0, 2, 1, 3]));
        expect(result.medianResponseMs).toBeNull();
        expect(result.flagged).toBe(false);
    });

    it("uses the median, so one slow item cannot mask fast answering", () => {
        const responses = [...run([0, 1, 2, 3, 0], 150), response(1, 90_000)];
        expect(computeQuality(responses).flagged).toBe(true);
    });
});
