/**
 * Fits graded response model parameters from contributed responses.
 *
 *   npm run calibrate            # report only, writes nothing
 *   npm run calibrate -- --emit  # also write the parameter set file
 *
 * The item bank ships provisional parameters assigned by rational item
 * mapping. This is what replaces them with empirical ones once enough people
 * have opted in to contribute.
 *
 * Deliberately does not activate anything. It writes a candidate parameter set
 * to a file and stops; promoting one is a reviewed commit that also bumps
 * PARAMETER_SET_ID, so every stored profile stays attributable to the metric
 * it was actually scored on.
 *
 * Refuses to run below a minimum sample rather than producing estimates that
 * look like measurements. That threshold is the honest part of this script:
 * marginal maximum likelihood will happily return numbers from thirty
 * respondents, and they will be noise.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../src/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve } from "node:path";

import { BANKS_BY_DOMAIN, PARAMETER_SET_ID } from "../src/lib/assessment/banks";
import { DOMAIN_ORDER } from "../src/lib/assessment/session";
import type { BankItem, DomainKey } from "../src/lib/assessment/types";

config({ path: resolve(__dirname, "../.env") });

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/**
 * Below this, per domain, estimates are not worth the file they would be
 * written to. Published IRT calibrations use several hundred respondents per
 * item; this is a floor for a prototype, not a standard.
 */
const MIN_RESPONDENTS_PER_DOMAIN = 200;

/** Below this an item has too few observations for its own thresholds. */
const MIN_RESPONSES_PER_ITEM = 100;

const QUADRATURE_POINTS = 40;
const GRID: number[] = Array.from(
    { length: QUADRATURE_POINTS },
    (_, i) => -4 + (i * 8) / (QUADRATURE_POINTS - 1)
);
const PRIOR: number[] = GRID.map((t) => Math.exp(-0.5 * t * t));

const EM_ITERATIONS = 60;
const EM_TOLERANCE = 1e-4;

interface ItemFit {
    itemId: string;
    a: number;
    b: number[];
    n: number;
}

/**
 * What a reviewer needs to see before promoting a parameter set.
 *
 * Marginal maximum likelihood fixes the prior at N(0,1), which is what defines
 * the scale. If the contributing sample is genuinely more spread out than that,
 * the fit absorbs the difference by inflating discriminations and compressing
 * thresholds instead of widening the population. The parameters still describe
 * the items correctly relative to one another, but the metric has moved, and a
 * severity band drawn on the old one no longer cuts at the same place.
 *
 * `thetaSd` well away from 1 is that happening. It does not make the fit wrong;
 * it makes promoting the set a decision about re-anchoring the bands, not a
 * drop-in replacement.
 */
interface DomainDiagnostics {
    respondents: number;
    thetaMean: number;
    /** Spread of the EAP estimates themselves. Always shrunk; see populationSd. */
    thetaSd: number;
    /**
     * Spread of the underlying trait, recovered as Var(EAP) + mean SE^2.
     *
     * EAP estimates are pulled toward the prior mean, so their raw spread sits
     * below the population's by an amount that grows as measurement gets
     * noisier. Comparing the raw spread against 1 would therefore flag every
     * short or imprecise domain as drifted when nothing had moved. This is the
     * number to read.
     */
    populationSd: number;
    meanSe: number;
    reliability: number;
}

function cumulative(theta: number, a: number, b: number[]): number[] {
    const cum = [1];
    for (const t of b) cum.push(1 / (1 + Math.exp(-a * (theta - t))));
    cum.push(0);
    return cum;
}

function categoryProbs(theta: number, a: number, b: number[]): number[] {
    const cum = cumulative(theta, a, b);
    const out: number[] = [];
    for (let c = 0; c < cum.length - 1; c++) out.push(Math.max(cum[c] - cum[c + 1], 1e-12));
    return out;
}

/**
 * Marginal maximum likelihood by expectation maximisation.
 *
 * E step: posterior over the ability grid for each respondent, from their
 * whole response pattern, which is what makes this marginal rather than joint
 * and keeps item parameters from absorbing respondent-level noise.
 *
 * M step: a coordinate ascent on each item's discrimination and thresholds
 * against the expected counts. Plain hill climbing on a small parameter set
 * rather than Newton steps: slower, but it cannot diverge, and this runs
 * offline where a few seconds costs nothing.
 */
function calibrateDomain(
    items: BankItem[],
    patterns: Map<string, Map<string, number>>
): { fits: ItemFit[]; diagnostics: DomainDiagnostics } {
    const itemIds = items.map((i) => i.id);
    const categories = new Map(items.map((i) => [i.id, i.params.b.length + 1]));

    // Start from the provisional values: they are a considered prior, and
    // starting from nowhere makes EM wander on small samples.
    const params = new Map(
        items.map((i) => [i.id, { a: i.params.a, b: [...i.params.b] }])
    );

    const respondents = [...patterns.values()];
    let previousLogLik = -Infinity;

    for (let iter = 0; iter < EM_ITERATIONS; iter++) {
        // ---- E step: expected counts n[item][category][gridpoint] ----
        const counts = new Map<string, number[][]>();
        for (const id of itemIds) {
            counts.set(
                id,
                Array.from({ length: categories.get(id)! }, () => new Array(GRID.length).fill(0))
            );
        }

        let logLik = 0;
        for (const responses of respondents) {
            const posterior = new Array(GRID.length).fill(0);
            for (let q = 0; q < GRID.length; q++) {
                let likelihood = PRIOR[q];
                for (const [itemId, value] of responses) {
                    const p = params.get(itemId);
                    if (!p) continue;
                    likelihood *= categoryProbs(GRID[q], p.a, p.b)[value] ?? 1e-12;
                }
                posterior[q] = likelihood;
            }
            const mass = posterior.reduce((s, x) => s + x, 0);
            if (mass <= 0) continue;
            logLik += Math.log(mass);

            for (let q = 0; q < GRID.length; q++) {
                const weight = posterior[q] / mass;
                for (const [itemId, value] of responses) {
                    const table = counts.get(itemId);
                    if (table) table[value][q] += weight;
                }
            }
        }

        // ---- M step ----
        for (const id of itemIds) {
            const table = counts.get(id)!;
            const current = params.get(id)!;
            params.set(id, maximiseItem(table, current));
        }

        if (Math.abs(logLik - previousLogLik) < EM_TOLERANCE) break;
        previousLogLik = logLik;
    }

    const fits = items.map((item) => {
        const p = params.get(item.id)!;
        const n = respondents.filter((r) => r.has(item.id)).length;
        return {
            itemId: item.id,
            a: round(p.a),
            b: p.b.map(round),
            n,
        };
    });

    return { fits, diagnostics: diagnose(respondents, params) };
}

/** Scores the contributing sample on the parameters just fitted to it. */
function diagnose(
    respondents: Map<string, number>[],
    params: Map<string, { a: number; b: number[] }>
): DomainDiagnostics {
    const thetas: number[] = [];
    const ses: number[] = [];

    for (const responses of respondents) {
        const posterior = GRID.map((theta, q) => {
            let likelihood = PRIOR[q];
            for (const [itemId, value] of responses) {
                const p = params.get(itemId);
                if (p) likelihood *= categoryProbs(theta, p.a, p.b)[value] ?? 1e-12;
            }
            return likelihood;
        });
        const mass = posterior.reduce((s, x) => s + x, 0);
        if (mass <= 0) continue;

        const mean = GRID.reduce((s, t, q) => s + t * posterior[q], 0) / mass;
        const variance =
            GRID.reduce((s, t, q) => s + (t - mean) ** 2 * posterior[q], 0) / mass;
        thetas.push(mean);
        ses.push(Math.sqrt(variance));
    }

    const thetaMean = thetas.reduce((s, x) => s + x, 0) / thetas.length;
    const thetaVar =
        thetas.reduce((s, x) => s + (x - thetaMean) ** 2, 0) / (thetas.length - 1);
    const meanSe = ses.reduce((s, x) => s + x, 0) / ses.length;

    // Posterior variance decomposition: the trait's total variance splits into
    // the spread of the posterior means and the mean posterior variance.
    const totalVar = thetaVar + meanSe ** 2;

    return {
        respondents: thetas.length,
        thetaMean: round(thetaMean),
        thetaSd: round(Math.sqrt(thetaVar)),
        populationSd: round(Math.sqrt(totalVar)),
        meanSe: round(meanSe),
        // Marginal reliability: how much of the total variance is signal
        // rather than measurement error.
        reliability: round(thetaVar / totalVar),
    };
}

/** Expected log likelihood of one item under the current expected counts. */
function itemLogLik(table: number[][], a: number, b: number[]): number {
    let total = 0;
    for (let q = 0; q < GRID.length; q++) {
        const probs = categoryProbs(GRID[q], a, b);
        for (let c = 0; c < table.length; c++) {
            const weight = table[c][q];
            if (weight > 0) total += weight * Math.log(probs[c]);
        }
    }
    return total;
}

/** Coordinate ascent with a shrinking step. Cannot diverge; just stops improving. */
function maximiseItem(table: number[][], start: { a: number; b: number[] }) {
    let { a } = start;
    let b = [...start.b];
    let best = itemLogLik(table, a, b);

    for (let step = 0.4; step > 0.01; step *= 0.6) {
        let improved = true;
        while (improved) {
            improved = false;

            for (const delta of [step, -step]) {
                // Discrimination has to stay positive, or the item inverts and
                // a higher trait predicts a lower answer.
                const candidate = Math.max(0.2, Math.min(4, a + delta));
                const ll = itemLogLik(table, candidate, b);
                if (ll > best) {
                    a = candidate;
                    best = ll;
                    improved = true;
                }
            }

            for (let k = 0; k < b.length; k++) {
                for (const delta of [step, -step]) {
                    const candidate = [...b];
                    candidate[k] += delta;
                    // The graded response model requires strictly increasing
                    // thresholds; a swap makes a category impossible at every
                    // ability and the likelihood stops meaning anything.
                    if (!isIncreasing(candidate)) continue;
                    const ll = itemLogLik(table, a, candidate);
                    if (ll > best) {
                        b = candidate;
                        best = ll;
                        improved = true;
                    }
                }
            }
        }
    }

    return { a, b };
}

function isIncreasing(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
        if (values[i] <= values[i - 1]) return false;
    }
    return true;
}

const round = (x: number) => Math.round(x * 1000) / 1000;

async function main() {
    const emit = process.argv.includes("--emit");

    const rows = await prisma.calibrationResponse.findMany({
        select: { respondentKey: true, itemId: true, value: true },
    });

    console.log(`contributed responses: ${rows.length.toLocaleString()}`);
    if (rows.length === 0) {
        console.log("\nNothing to calibrate. Responses arrive only from members who have");
        console.log("explicitly opted in, which is off by default.");
        return;
    }

    const itemToDomain = new Map<string, DomainKey>();
    for (const domain of DOMAIN_ORDER) {
        for (const item of BANKS_BY_DOMAIN[domain]) itemToDomain.set(item.id, domain);
    }

    const fits: Record<string, ItemFit> = {};
    const diagnostics: Record<string, DomainDiagnostics> = {};
    const report: string[] = [];

    for (const domain of DOMAIN_ORDER) {
        const items = BANKS_BY_DOMAIN[domain];
        const ids = new Set(items.map((i) => i.id));

        const patterns = new Map<string, Map<string, number>>();
        for (const row of rows) {
            if (!ids.has(row.itemId)) continue;
            if (!patterns.has(row.respondentKey)) patterns.set(row.respondentKey, new Map());
            patterns.get(row.respondentKey)!.set(row.itemId, row.value);
        }

        const respondents = patterns.size;
        if (respondents < MIN_RESPONDENTS_PER_DOMAIN) {
            report.push(
                `  ${domain.padEnd(11)} SKIPPED  ${respondents} respondents, need ${MIN_RESPONDENTS_PER_DOMAIN}`
            );
            continue;
        }

        const { fits: fitted, diagnostics: diag } = calibrateDomain(items, patterns);
        let kept = 0;
        for (const fit of fitted) {
            if (fit.n < MIN_RESPONSES_PER_ITEM) continue;
            fits[fit.itemId] = fit;
            kept++;
        }
        diagnostics[domain] = diag;
        report.push(
            `  ${domain.padEnd(11)} fitted   ${respondents} respondents, ${kept}/${items.length} items met the per-item floor`
        );
    }

    console.log("\nper domain:");
    console.log(report.join("\n"));

    const fittedDomains = Object.entries(diagnostics);
    if (fittedDomains.length > 0) {
        console.log("\nscale check (pop SD should sit near 1; further away means the");
        console.log("metric has moved and the severity bands need re-anchoring):\n");
        console.log(
            `  ${"domain".padEnd(11)} ${"n".padStart(5)} ${"mean".padStart(7)} ${"EAP SD".padStart(7)} ${"pop SD".padStart(7)} ${"mean SE".padStart(8)} ${"rel".padStart(6)}`
        );
        for (const [domain, d] of fittedDomains) {
            const flag = Math.abs(d.populationSd - 1) > 0.15 ? "  <- drifted" : "";
            console.log(
                `  ${domain.padEnd(11)} ${String(d.respondents).padStart(5)} ${d.thetaMean.toFixed(3).padStart(7)} ${d.thetaSd.toFixed(3).padStart(7)} ${d.populationSd.toFixed(3).padStart(7)} ${d.meanSe.toFixed(3).padStart(8)} ${d.reliability.toFixed(3).padStart(6)}${flag}`
            );
        }
    }

    const fittedCount = Object.keys(fits).length;
    console.log(`\nitems with empirical parameters: ${fittedCount}`);

    if (fittedCount === 0) {
        console.log("\nNo domain reached the minimum. The bank keeps its provisional parameters,");
        console.log("which is the correct outcome: estimates from this little data would look");
        console.log("like measurements without being any.");
        return;
    }

    if (!emit) {
        console.log("\nReport only. Re-run with --emit to write the candidate parameter set.");
        return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const id = `ps-${stamp}-empirical-1`;
    const out = {
        id,
        createdAt: new Date().toISOString(),
        method: "marginal maximum likelihood, EM over a 40-point grid, N(0,1) prior",
        supersedes: PARAMETER_SET_ID,
        diagnostics,
        parameters: Object.fromEntries(
            Object.entries(fits).map(([itemId, fit]) => [
                itemId,
                { itemId, a: fit.a, b: fit.b, source: "EMPIRICAL", n: fit.n },
            ])
        ),
    };

    const path = join(__dirname, "..", "src", "lib", "assessment", "banks", `${id}.json`);
    writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf8");

    console.log(`\nwrote ${path}`);
    console.log("\nNot active. Promoting it is a reviewed commit that points the banks at");
    console.log("these values and bumps PARAMETER_SET_ID, so older profiles stay attributable");
    console.log("to the metric they were actually scored on.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
