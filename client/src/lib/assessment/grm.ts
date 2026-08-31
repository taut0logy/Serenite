// Samejima's Graded Response Model.
// An item with k ordered categories has discrimination `a` and k-1 increasing
// thresholds `b`. Defined via cumulative probabilities P*(X >= c).

import type { AdministeredResponse, ThetaEstimate } from "./types";

// EAP quadrature grid: 40 points on [-4, 4], standard normal prior.
const QUADRATURE_POINTS = 40;
const QUADRATURE_MIN = -4;
const QUADRATURE_MAX = 4;

const GRID: number[] = Array.from({ length: QUADRATURE_POINTS }, (_, i) =>
    QUADRATURE_MIN + (i * (QUADRATURE_MAX - QUADRATURE_MIN)) / (QUADRATURE_POINTS - 1)
);

const PRIOR: number[] = GRID.map((theta) => Math.exp(-0.5 * theta * theta));

/** P*(X >= c) for c = 0..k. Length is b.length + 2. */
function cumulativeProbabilities(theta: number, a: number, b: number[]): number[] {
    const cum = [1];
    for (const threshold of b) {
        cum.push(1 / (1 + Math.exp(-a * (theta - threshold))));
    }
    cum.push(0);
    return cum;
}

/** P(X = c) for each category c = 0..k-1. Always sums to 1. */
export function categoryProbabilities(theta: number, a: number, b: number[]): number[] {
    const cum = cumulativeProbabilities(theta, a, b);
    const probs: number[] = [];
    for (let c = 0; c < cum.length - 1; c++) {
        probs.push(cum[c] - cum[c + 1]);
    }
    return probs;
}

/** Fisher information at theta. Reduces to a^2 * P * (1-P) for a 2-category item. */
export function itemInformation(theta: number, a: number, b: number[]): number {
    const cum = cumulativeProbabilities(theta, a, b);
    let total = 0;

    for (let c = 0; c < cum.length - 1; c++) {
        const p = cum[c] - cum[c + 1];
        if (p <= Number.EPSILON) continue; // avoid divide by zero on empty mass
        const numerator = cum[c] * (1 - cum[c]) - cum[c + 1] * (1 - cum[c + 1]);
        total += (numerator * numerator) / p;
    }

    return a * a * total;
}

// EAP estimate of theta. Used instead of MLE because MLE diverges on all-min
// or all-max response patterns; EAP always returns a finite estimate.
export function estimateTheta(responses: AdministeredResponse[]): ThetaEstimate {
    const posterior = GRID.map((theta, q) => {
        let likelihood = PRIOR[q];
        for (const r of responses) {
            const p = categoryProbabilities(theta, r.a, r.b)[r.value];
            likelihood *= p ?? 0;
        }
        return likelihood;
    });

    const mass = posterior.reduce((s, x) => s + x, 0);
    if (mass <= 0) return { theta: 0, se: 1 };

    let theta = 0;
    for (let q = 0; q < GRID.length; q++) theta += GRID[q] * posterior[q];
    theta /= mass;

    let variance = 0;
    for (let q = 0; q < GRID.length; q++) {
        const d = GRID[q] - theta;
        variance += d * d * posterior[q];
    }
    variance /= mass;

    return { theta, se: Math.sqrt(variance) };
}
