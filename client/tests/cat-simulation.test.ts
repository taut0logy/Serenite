import { describe, it, expect } from "vitest";
import { pickNext } from "@/lib/assessment/cat";
import { estimateTheta, categoryProbabilities } from "@/lib/assessment/grm";
import { BANKS_BY_DOMAIN } from "@/lib/assessment/banks";
import { POLICY_BY_DOMAIN } from "@/lib/assessment/policy";
import type { DomainPolicy } from "@/lib/assessment/policy";
import type { AdministeredResponse, BankItem } from "@/lib/assessment/types";

// Deterministic PRNG so the simulated response draws are reproducible.
// Item *selection* still uses Math.random internally (exposure control), so
// this harness is statistical, not bit-for-bit deterministic — that's why
// assertions below use generous bounds over many simulated respondents
// rather than exact values.
function mulberry32(seed: number) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function sampleCategory(probs: number[], rng: () => number): number {
    const r = rng();
    let cumulative = 0;
    for (let c = 0; c < probs.length; c++) {
        cumulative += probs[c];
        if (r < cumulative) return c;
    }
    return probs.length - 1;
}

interface SimResult {
    thetaTrue: number;
    thetaHat: number;
    se: number;
    itemCount: number;
}

// Runs one simulated respondent through a domain's CAT loop. `distort`
// perturbs the *true* generating parameters away from the provisional ones
// the engine scores with, for the misspecification study.
function simulateRespondent(
    bank: BankItem[],
    policy: DomainPolicy,
    thetaTrue: number,
    rng: () => number,
    distort: (a: number, b: number[]) => { a: number; b: number[] } = (a, b) => ({ a, b })
): SimResult {
    const administered: AdministeredResponse[] = [];
    let item = pickNext(bank, administered, policy);

    while (item) {
        const trueParams = distort(item.params.a, item.params.b);
        const probs = categoryProbabilities(thetaTrue, trueParams.a, trueParams.b);
        const value = sampleCategory(probs, rng);
        administered.push({ itemId: item.id, a: item.params.a, b: item.params.b, value });
        item = pickNext(bank, administered, policy);
    }

    const { theta, se } = estimateTheta(administered);
    return { thetaTrue, thetaHat: theta, se, itemCount: administered.length };
}

function summarize(results: SimResult[]) {
    const n = results.length;
    const errors = results.map((r) => r.thetaHat - r.thetaTrue);
    const bias = errors.reduce((s, e) => s + e, 0) / n;
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / n);

    const meanTrue = results.reduce((s, r) => s + r.thetaTrue, 0) / n;
    const meanHat = results.reduce((s, r) => s + r.thetaHat, 0) / n;
    let cov = 0, varTrue = 0, varHat = 0;
    for (const r of results) {
        cov += (r.thetaTrue - meanTrue) * (r.thetaHat - meanHat);
        varTrue += (r.thetaTrue - meanTrue) ** 2;
        varHat += (r.thetaHat - meanHat) ** 2;
    }
    const correlation = cov / Math.sqrt(varTrue * varHat);

    const avgItems = results.reduce((s, r) => s + r.itemCount, 0) / n;
    const avgSE = results.reduce((s, r) => s + r.se, 0) / n;

    return { bias, rmse, correlation, avgItems, avgSE };
}

const N_RESPONDENTS = 300;

describe("CAT simulation: theta recovery", () => {
    it("recovers theta with low bias and reasonable RMSE (depression)", () => {
        const rng = mulberry32(42);
        const results: SimResult[] = [];
        for (let i = 0; i < N_RESPONDENTS; i++) {
            // Box-Muller for a standard normal true theta
            const u1 = rng(), u2 = rng();
            const thetaTrue = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            results.push(simulateRespondent(BANKS_BY_DOMAIN.depression, POLICY_BY_DOMAIN.depression, thetaTrue, rng));
        }

        const { bias, rmse, correlation, avgItems } = summarize(results);

        expect(Math.abs(bias)).toBeLessThan(0.25);
        expect(rmse).toBeLessThan(0.8);
        expect(correlation).toBeGreaterThan(0.7);
        // Depression forces all 9 PHQ-9 anchors before any adaptive item.
        expect(avgItems).toBeGreaterThanOrEqual(9);
    });

    it("recovers theta for a domain with no forced anchors (sleep)", () => {
        const rng = mulberry32(7);
        const results: SimResult[] = [];
        for (let i = 0; i < N_RESPONDENTS; i++) {
            const u1 = rng(), u2 = rng();
            const thetaTrue = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            results.push(simulateRespondent(BANKS_BY_DOMAIN.sleep, POLICY_BY_DOMAIN.sleep, thetaTrue, rng));
        }

        const { correlation, avgItems } = summarize(results);

        expect(correlation).toBeGreaterThan(0.6);
        expect(avgItems).toBeGreaterThanOrEqual(4);
        expect(avgItems).toBeLessThanOrEqual(8);
    });

    it("does not overexpose any single item beyond a reasonable ceiling", () => {
        const rng = mulberry32(99);
        const exposure = new Map<string, number>();
        let totalAdaptive = 0;

        for (let i = 0; i < N_RESPONDENTS; i++) {
            const u1 = rng(), u2 = rng();
            const thetaTrue = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const administered: AdministeredResponse[] = [];
            let item = pickNext(BANKS_BY_DOMAIN.sleep, administered, POLICY_BY_DOMAIN.sleep);
            while (item) {
                const probs = categoryProbabilities(thetaTrue, item.params.a, item.params.b);
                const value = sampleCategory(probs, rng);
                administered.push({ itemId: item.id, a: item.params.a, b: item.params.b, value });
                exposure.set(item.id, (exposure.get(item.id) ?? 0) + 1);
                totalAdaptive++;
                item = pickNext(BANKS_BY_DOMAIN.sleep, administered, POLICY_BY_DOMAIN.sleep);
            }
        }

        const maxExposureRate = Math.max(...exposure.values()) / totalAdaptive;
        // 15 sleep items; a single item should not dominate selection.
        expect(maxExposureRate).toBeLessThan(0.35);
    });
});

describe("CAT simulation: parameter misspecification", () => {
    it("degrades theta recovery when true parameters differ from provisional ones", () => {
        const matched = mulberry32(11);
        const misspecified = mulberry32(11);

        const matchedResults: SimResult[] = [];
        const misspecifiedResults: SimResult[] = [];

        for (let i = 0; i < N_RESPONDENTS; i++) {
            const u1 = matched(), u2 = matched();
            const thetaTrue = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

            matchedResults.push(simulateRespondent(BANKS_BY_DOMAIN.anxiety, POLICY_BY_DOMAIN.anxiety, thetaTrue, matched));
            misspecifiedResults.push(
                simulateRespondent(BANKS_BY_DOMAIN.anxiety, POLICY_BY_DOMAIN.anxiety, thetaTrue, misspecified, (a, b) => ({
                    a: a * 0.5, // true discrimination is half what the engine assumes
                    b: b.map((t) => t + 0.8), // true thresholds shifted higher
                }))
            );
        }

        const matchedStats = summarize(matchedResults);
        const misspecifiedStats = summarize(misspecifiedResults);

        // The point of this test: misspecification has a measured cost,
        // not an assumed one. It should not vanish.
        expect(misspecifiedStats.rmse).toBeGreaterThan(matchedStats.rmse);
    });
});
