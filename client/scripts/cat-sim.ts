/**
 * Simulation harness for the adaptive assessment and the group matcher.
 *
 * Produces the numbers reported in the SoftwareX paper, sections 2.3.1 and
 * 2.3.2. Nothing here touches the database or the network: it drives the live
 * engine (`pickNext`, `estimateTheta`) over synthetic respondents whose true
 * theta is known, so recovery error can be measured directly.
 *
 *   npm run sim              # default: 10000 respondents, seed 20260830
 *   npm run sim -- 2000 7    # respondents, seed
 *
 * Every free parameter is declared in CONFIG below and echoed in the report
 * header. Fix them before running. Tuning them until the table looks good is
 * how a simulation stops being evidence.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BANKS_BY_DOMAIN, PARAMETER_SET_ID } from "../src/lib/assessment/banks";
import { pickNext } from "../src/lib/assessment/cat";
import { categoryProbabilities, estimateTheta } from "../src/lib/assessment/grm";
import { computeMatchScore } from "../src/lib/assessment/group-matching";
import { DOMAIN_ORDER } from "../src/lib/assessment/session";
import type { AdministeredResponse, BankItem, DomainKey } from "../src/lib/assessment/types";

// ---------------------------------------------------------------- config

const CONFIG = {
    respondents: Number(process.argv[2]) || 10_000,
    seed: Number(process.argv[3]) || 20_260_830,

    /**
     * Threshold misspecification levels. The engine always scores under the
     * shipped PROVISIONAL parameters; responses are generated from TRUE
     * parameters that differ from them by Gaussian noise of this SD on the
     * theta metric. 0.0 is the matched baseline.
     */
    noiseLevels: [
        { label: "Matched", sd: 0.0 },
        { label: "Mild", sd: 0.3 },
        { label: "Moderate", sd: 0.6 },
        { label: "Severe", sd: 1.0 },
    ],

    /**
     * Correlation matrix for true theta, in DOMAIN_ORDER:
     * depression, anxiety, trauma, sleep, social, selfWorth.
     * Chosen before any run, from the internalising-disorder literature:
     * depression and anxiety correlate strongly, sleep loads on both, trauma
     * is moderately related to all, self-worth tracks depression.
     */
    thetaCorrelation: [
        [1.00, 0.60, 0.35, 0.45, 0.40, 0.55],
        [0.60, 1.00, 0.35, 0.45, 0.40, 0.40],
        [0.35, 0.35, 1.00, 0.30, 0.25, 0.30],
        [0.45, 0.45, 0.30, 1.00, 0.20, 0.25],
        [0.40, 0.40, 0.25, 0.20, 1.00, 0.45],
        [0.55, 0.40, 0.30, 0.25, 0.45, 1.00],
    ],

    /** Probability a simulated respondent endorses the trauma exposure gate. */
    traumaExposureRate: 0.35,

    /** Distance scale in group-matching.ts, mirrored here for the cosine arm. */
    matchDistanceScale: 2,
};

// ---------------------------------------------------------------- rng

/** Mulberry32. Deterministic, so a reported number can be reproduced exactly. */
function makeRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function makeNormal(rng: () => number): () => number {
    let spare: number | null = null;
    return () => {
        if (spare !== null) {
            const v = spare;
            spare = null;
            return v;
        }
        let u = 0;
        let v = 0;
        let s = 0;
        do {
            u = rng() * 2 - 1;
            v = rng() * 2 - 1;
            s = u * u + v * v;
        } while (s === 0 || s >= 1);
        const f = Math.sqrt((-2 * Math.log(s)) / s);
        spare = v * f;
        return u * f;
    };
}

/** Cholesky decomposition, for drawing correlated theta. */
function cholesky(m: number[][]): number[][] {
    const n = m.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
            if (i === j) {
                const d = m[i][i] - sum;
                if (d <= 0) throw new Error("thetaCorrelation is not positive definite");
                L[i][j] = Math.sqrt(d);
            } else {
                L[i][j] = (m[i][j] - sum) / L[j][j];
            }
        }
    }
    return L;
}

// ---------------------------------------------------------------- stats

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function sd(xs: number[]): number {
    const m = mean(xs);
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

function pearson(a: number[], b: number[]): number {
    const ma = mean(a);
    const mb = mean(b);
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < a.length; i++) {
        num += (a[i] - ma) * (b[i] - mb);
        da += (a[i] - ma) ** 2;
        db += (b[i] - mb) ** 2;
    }
    return num / Math.sqrt(da * db);
}

/** Average ranks, so ties do not bias the coefficient. */
function ranks(xs: number[]): number[] {
    const idx = xs.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v);
    const r = new Array(xs.length).fill(0);
    let i = 0;
    while (i < idx.length) {
        let j = i;
        while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
        const avg = (i + j) / 2 + 1;
        for (let k = i; k <= j; k++) r[idx[k].i] = avg;
        i = j + 1;
    }
    return r;
}

const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));

function quantile(xs: number[], q: number): number {
    const s = [...xs].sort((p, r) => p - r);
    const pos = (s.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

// ---------------------------------------------------------------- banks

/**
 * A copy of the shipped banks whose thresholds have been perturbed. These are
 * the "true" parameters responses are generated from; the engine never sees
 * them. Thresholds are re-sorted because the graded response model requires
 * them strictly increasing, and independent noise can reorder them.
 */
function perturbBanks(
    banks: Record<DomainKey, BankItem[]>,
    noiseSd: number,
    normal: () => number
): Record<DomainKey, BankItem[]> {
    const out = {} as Record<DomainKey, BankItem[]>;
    for (const domain of DOMAIN_ORDER) {
        out[domain] = banks[domain].map((item) => {
            if (noiseSd === 0) return item;
            const b = item.params.b.map((t) => t + normal() * noiseSd).sort((x, y) => x - y);
            return { ...item, params: { ...item.params, b } };
        });
    }
    return out;
}

function sampleCategory(theta: number, a: number, b: number[], rng: () => number): number {
    const probs = categoryProbabilities(theta, a, b);
    let u = rng();
    for (let c = 0; c < probs.length; c++) {
        u -= probs[c];
        if (u <= 0) return c;
    }
    return probs.length - 1;
}

// ---------------------------------------------------------------- one respondent

interface DomainOutcome {
    domain: DomainKey;
    thetaTrue: number;
    thetaHat: number;
    se: number;
    items: number;
    hitCap: boolean;
}

interface RespondentOutcome {
    domains: DomainOutcome[];
    /** Six-dimensional estimate, missing domains defaulted to 0, as the matcher does. */
    vectorHat: number[];
    vectorTrue: number[];
    itemsAdministered: string[];
}

function runRespondent(
    provisional: Record<DomainKey, BankItem[]>,
    trueBanks: Record<DomainKey, BankItem[]>,
    thetaTrue: Record<DomainKey, number>,
    traumaExposed: boolean,
    rng: () => number
): RespondentOutcome {
    const domains: DomainOutcome[] = [];
    const administeredIds: string[] = [];
    const hat: Partial<Record<DomainKey, number>> = {};

    for (const domain of DOMAIN_ORDER) {
        if (domain === "trauma" && !traumaExposed) continue;

        const responses: AdministeredResponse[] = [];
        const trueById = new Map(trueBanks[domain].map((i) => [i.id, i]));

        // Walk the real engine. It selects under the provisional parameters and
        // stores them on each response, which is what estimateTheta scores with.
        for (;;) {
            const item = pickNext(provisional[domain], responses);
            if (!item) break;

            const truth = trueById.get(item.id)!;
            const value = sampleCategory(
                thetaTrue[domain],
                truth.params.a,
                truth.params.b,
                rng
            );

            responses.push({
                itemId: item.id,
                a: item.params.a,
                b: item.params.b,
                value,
            });
            administeredIds.push(item.id);
        }

        const est = estimateTheta(responses);
        const adaptive = responses.filter((r) => {
            const it = provisional[domain].find((b) => b.id === r.itemId);
            return it && !it.isAnchor && !it.isSafetyItem;
        }).length;

        hat[domain] = est.theta;
        domains.push({
            domain,
            thetaTrue: thetaTrue[domain],
            thetaHat: est.theta,
            se: est.se,
            items: responses.length,
            hitCap: adaptive >= 8,
        });
    }

    return {
        domains,
        vectorHat: DOMAIN_ORDER.map((d) => hat[d] ?? 0),
        vectorTrue: DOMAIN_ORDER.map((d) => thetaTrue[d]),
        itemsAdministered: administeredIds,
    };
}

// ---------------------------------------------------------------- study 1

interface ConditionResult {
    label: string;
    sd: number;
    bias: number;
    rmse: number;
    pearson: number;
    spearman: number;
    medianItemsPerDomain: number;
    medianItemsTotal: number;
    capRate: number;
    meanSeAtStop: number;
    maxExposure: number;
    adaptivePoolUsed: number;
    perDomain: { domain: DomainKey; n: number; bias: number; rmse: number; median: number }[];
    vectorsHat: number[][];
    vectorsTrue: number[][];
}

function runCondition(label: string, noiseSd: number): ConditionResult {
    const rng = makeRng(CONFIG.seed + Math.round(noiseSd * 1000));
    const normal = makeNormal(rng);
    const L = cholesky(CONFIG.thetaCorrelation);

    const trueBanks = perturbBanks(BANKS_BY_DOMAIN, noiseSd, normal);
    const forcedIds = new Set(
        DOMAIN_ORDER.flatMap((d) =>
            BANKS_BY_DOMAIN[d].filter((i) => i.isAnchor || i.isSafetyItem).map((i) => i.id)
        )
    );

    const allTrue: number[] = [];
    const allHat: number[] = [];
    const allSe: number[] = [];
    const itemsPerDomain: number[] = [];
    const itemsTotal: number[] = [];
    const exposure = new Map<string, number>();
    let capHits = 0;
    let domainCount = 0;
    const byDomain = new Map<DomainKey, { t: number[]; h: number[]; items: number[] }>();
    const vectorsHat: number[][] = [];
    const vectorsTrue: number[][] = [];

    for (let n = 0; n < CONFIG.respondents; n++) {
        const z = DOMAIN_ORDER.map(() => normal());
        const correlated = L.map((row) => row.reduce((s, v, k) => s + v * z[k], 0));
        const thetaTrue = Object.fromEntries(
            DOMAIN_ORDER.map((d, i) => [d, correlated[i]])
        ) as Record<DomainKey, number>;

        const exposed = rng() < CONFIG.traumaExposureRate;
        const out = runRespondent(BANKS_BY_DOMAIN, trueBanks, thetaTrue, exposed, rng);

        for (const d of out.domains) {
            allTrue.push(d.thetaTrue);
            allHat.push(d.thetaHat);
            allSe.push(d.se);
            itemsPerDomain.push(d.items);
            domainCount++;
            if (d.hitCap) capHits++;
            if (!byDomain.has(d.domain)) byDomain.set(d.domain, { t: [], h: [], items: [] });
            const bd = byDomain.get(d.domain)!;
            bd.t.push(d.thetaTrue);
            bd.h.push(d.thetaHat);
            bd.items.push(d.items);
        }
        itemsTotal.push(out.itemsAdministered.length);
        for (const id of out.itemsAdministered) {
            if (forcedIds.has(id)) continue; // anchors/safety are 1.0 by design
            exposure.set(id, (exposure.get(id) ?? 0) + 1);
        }
        vectorsHat.push(out.vectorHat);
        vectorsTrue.push(out.vectorTrue);
    }

    const errs = allHat.map((h, i) => h - allTrue[i]);

    return {
        label,
        sd: noiseSd,
        bias: mean(errs),
        rmse: Math.sqrt(mean(errs.map((e) => e * e))),
        pearson: pearson(allHat, allTrue),
        spearman: spearman(allHat, allTrue),
        medianItemsPerDomain: quantile(itemsPerDomain, 0.5),
        medianItemsTotal: quantile(itemsTotal, 0.5),
        capRate: capHits / domainCount,
        meanSeAtStop: mean(allSe),
        maxExposure: exposure.size ? Math.max(...[...exposure.values()]) / CONFIG.respondents : 0,
        adaptivePoolUsed: exposure.size,
        perDomain: DOMAIN_ORDER.map((d) => {
            const bd = byDomain.get(d)!;
            const e = bd.h.map((h, i) => h - bd.t[i]);
            return {
                domain: d,
                n: bd.t.length,
                bias: mean(e),
                rmse: Math.sqrt(mean(e.map((x) => x * x))),
                median: quantile(bd.items, 0.5),
            };
        }),
        vectorsHat,
        vectorsTrue,
    };
}

// ---------------------------------------------------------------- study 2

/** Pulls the real seeded group targets out of prisma/seed-groups.ts. */
function loadGroupSeeds(): number[][] {
    const src = readFileSync(join(__dirname, "..", "prisma", "seed-groups.ts"), "utf8");
    const re =
        /targetThetaDepression:\s*(-?[\d.]+),\s*targetThetaAnxiety:\s*(-?[\d.]+),\s*targetThetaTrauma:\s*(-?[\d.]+),\s*targetThetaSleep:\s*(-?[\d.]+),\s*targetThetaSocial:\s*(-?[\d.]+),\s*targetThetaSelfWorth:\s*(-?[\d.]+)/g;
    const out: number[][] = [];
    for (const m of src.matchAll(re)) out.push(m.slice(1, 7).map(Number));
    if (out.length === 0) throw new Error("no group seeds parsed from seed-groups.ts");
    return out;
}

function cosine(a: number[], b: number[]): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / Math.sqrt(na * nb);
}

interface MatchingResult {
    groups: number;
    distanceScores: number[];
    cosineRaw: number[];
    cosineShifted: number[];
    rankAgreement: number;
}

function runMatching(users: number[][], usersTrue: number[][]): MatchingResult {
    const seeds = loadGroupSeeds();
    // Mirrors the old non-negative cluster axes, so the documented cosine
    // saturation is reproduced on a comparable scale rather than asserted.
    const SHIFT = 4;

    const distanceScores: number[] = [];
    const cosineRaw: number[] = [];
    const cosineShifted: number[] = [];
    const rhoPerUser: number[] = [];

    for (let u = 0; u < users.length; u++) {
        const user = users[u];
        const userTrue = usersTrue[u];
        const observed: number[] = [];
        const oracle: number[] = [];

        for (const g of seeds) {
            const score = computeMatchScore(user, g);
            distanceScores.push(score);
            cosineRaw.push(100 * cosine(user, g));
            cosineShifted.push(
                100 * cosine(user.map((x) => x + SHIFT), g.map((x) => x + SHIFT))
            );
            observed.push(score);
            oracle.push(computeMatchScore(userTrue, g));
        }
        rhoPerUser.push(spearman(observed, oracle));
    }

    return {
        groups: seeds.length,
        distanceScores,
        cosineRaw,
        cosineShifted,
        rankAgreement: mean(rhoPerUser.filter((r) => Number.isFinite(r))),
    };
}

// ---------------------------------------------------------------- report

const f = (x: number, n = 2) => (x >= 0 ? " " : "") + x.toFixed(n);

function main() {
    console.log("Serenite adaptive assessment simulation");
    console.log("=".repeat(78));
    console.log(`parameter set     ${PARAMETER_SET_ID}`);
    console.log(`respondents       ${CONFIG.respondents.toLocaleString()} per condition`);
    console.log(`rng seed          ${CONFIG.seed} (mulberry32, deterministic)`);
    console.log(`trauma exposure   ${(CONFIG.traumaExposureRate * 100).toFixed(0)}%`);
    console.log(`theta correlation ${CONFIG.thetaCorrelation[0].join(", ")} (row 1 of 6)`);
    console.log(`bank size         ${DOMAIN_ORDER.reduce((s, d) => s + BANKS_BY_DOMAIN[d].length, 0)} items`);
    console.log();

    const results = CONFIG.noiseLevels.map((n) => runCondition(n.label, n.sd));

    console.log("STUDY 1  Trait recovery under parameter misspecification");
    console.log("-".repeat(78));
    console.log("Condition  Noise    Bias    RMSE   Pearson  Spearman  MedItems/dom  Cap%   SE");
    for (const r of results) {
        console.log(
            `${r.label.padEnd(10)} ${r.sd.toFixed(1)}    ${f(r.bias)}   ${r.rmse.toFixed(2)}    ` +
            `${r.pearson.toFixed(2)}      ${r.spearman.toFixed(2)}      ${r.medianItemsPerDomain.toFixed(1).padStart(4)}` +
            `        ${(r.capRate * 100).toFixed(1).padStart(4)}  ${r.meanSeAtStop.toFixed(2)}`
        );
    }
    console.log();
    console.log("LaTeX rows for Table 3:");
    for (const r of results) {
        console.log(
            `${r.label} & ${r.sd.toFixed(1)} & $${r.bias >= 0 ? "" : "-"}${Math.abs(r.bias).toFixed(2)}$ ` +
            `& ${r.rmse.toFixed(2)} & ${r.pearson.toFixed(2)} & ${r.spearman.toFixed(2)} \\\\`
        );
    }
    console.log();

    const matched = results[0];
    console.log(`Median items per SITTING (all domains): ${matched.medianItemsTotal.toFixed(0)}`);
    console.log(`Max exposure, adaptive items only:      ${matched.maxExposure.toFixed(3)}`);
    console.log(`Distinct adaptive items ever used:      ${matched.adaptivePoolUsed} of ${DOMAIN_ORDER.reduce((s2, d) => s2 + BANKS_BY_DOMAIN[d].filter((i) => !i.isAnchor && !i.isSafetyItem).length, 0)}`);
    console.log();
    console.log("Per domain, matched condition:");
    console.log("  domain        n        bias    rmse   median items");
    for (const d of matched.perDomain) {
        console.log(
            `  ${d.domain.padEnd(12)} ${String(d.n).padStart(6)}   ${f(d.bias)}    ${d.rmse.toFixed(2)}   ${d.median.toFixed(1)}`
        );
    }
    console.log();

    console.log("STUDY 2  Matching discrimination");
    console.log("-".repeat(78));
    const m = runMatching(matched.vectorsHat, matched.vectorsTrue);
    const line = (name: string, xs: number[]) =>
        console.log(
            `  ${name.padEnd(34)} mean ${mean(xs).toFixed(1).padStart(5)}   sd ${sd(xs).toFixed(1).padStart(5)}` +
            `   p5 ${quantile(xs, 0.05).toFixed(1).padStart(5)}   p95 ${quantile(xs, 0.95).toFixed(1).padStart(5)}`
        );
    console.log(`  seeded groups from prisma/seed-groups.ts: ${m.groups}`);
    line("distance score (shipped)", m.distanceScores);
    line("cosine on raw theta", m.cosineRaw);
    line("cosine on shifted non-negative axes", m.cosineShifted);
    console.log(`  rank agreement with oracle ordering: rho = ${m.rankAgreement.toFixed(2)}`);
    console.log();
    console.log("Note: the paper's cosine claim describes the pre-redesign matcher, whose");
    console.log("axes were non-negative. Quote the shifted row for that comparison and say");
    console.log("so, or quote the raw row and reword the sentence. Do not mix them.");
}

main();
