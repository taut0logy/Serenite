// Replaces the old cosine-similarity matcher, which the audit showed
// saturates near 100% for almost any two profiles since all axes were
// non-negative (same direction = same score, regardless of magnitude).
// This scores on Euclidean distance instead, so severity actually matters.

const DISTANCE_SCALE = 2;

export function computeCentroid(vectors: number[][]): number[] | null {
    if (vectors.length === 0) return null;
    const dims = vectors[0].length;
    const sums = new Array(dims).fill(0);
    for (const vector of vectors) {
        for (let i = 0; i < dims; i++) sums[i] += vector[i];
    }
    return sums.map((s) => s / vectors.length);
}

function euclideanDistance(a: number[], b: number[]): number {
    let sumSq = 0;
    for (let i = 0; i < a.length; i++) sumSq += (a[i] - b[i]) ** 2;
    return Math.sqrt(sumSq);
}

// 0-100. Exact match is 100; score decays with distance rather than
// staying flat as long as the two vectors point the same direction.
export function computeMatchScore(user: number[], target: number[]): number {
    const distance = euclideanDistance(user, target);
    const score = 100 * Math.exp(-distance / DISTANCE_SCALE);
    return Math.round(Math.max(0, Math.min(100, score)));
}

// A group with few members is scored mostly against its hand-authored
// seed; a full-strength centroid takes over once there's enough real data.
const CENTROID_FULL_WEIGHT_MEMBERS = 5;

export function blendGroupProfile(
    seed: number[],
    centroid: number[] | null,
    memberCount: number
): number[] {
    if (!centroid) return seed;
    const weight = Math.min(1, memberCount / CENTROID_FULL_WEIGHT_MEMBERS);
    return seed.map((s, i) => s * (1 - weight) + centroid[i] * weight);
}
