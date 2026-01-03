/**
 * Client-side mental health profiling algorithm.
 * Computes cluster scores from questionnaire responses using validated clinical cutoffs.
 * Based on HiTOP (Hierarchical Taxonomy of Psychopathology) transdiagnostic framework.
 */

// Question ID to domain mapping
const DOMAIN_MAP: Record<string, string> = {
  dep1: "depression", dep2: "depression", dep3: "depression",
  dep4: "depression", dep5: "depression", dep6: "depression", dep7: "depression",
  anx1: "anxiety", anx2: "anxiety", anx3: "anxiety", anx4: "anxiety",
  anx5: "anxiety", anx6: "anxiety", anx7: "anxiety",
  trauma1: "ptsd", trauma2: "ptsd", trauma3: "ptsd", trauma4: "ptsd",
  trauma5: "ptsd", trauma6: "ptsd", trauma7: "ptsd",
  social1: "social_anxiety", social2: "social_anxiety", social3: "social_anxiety",
  social4: "social_anxiety", social5: "social_anxiety", social6: "social_anxiety", social7: "social_anxiety",
  cog1: "cognitive_distortion", cog2: "cognitive_distortion", cog3: "cognitive_distortion",
  cog4: "cognitive_distortion", cog5: "cognitive_distortion", cog6: "cognitive_distortion", cog7: "cognitive_distortion",
  self1: "self_esteem", self2: "self_esteem", self3: "self_esteem", self4: "self_esteem",
  self5: "self_esteem", self6: "self_esteem", self7: "self_esteem",
  func1: "functional_impairment", func2: "functional_impairment",
  func3: "functional_impairment", func4: "functional_impairment",
  func5: "sleep_disruption", func6: "sleep_disruption",
  func7: "sleep_disruption", func8: "sleep_disruption",
};

// Domain configuration with max scores and clinical cutoffs
interface DomainConfig {
  max: number;
  cutoffs: Array<[number, number, SeverityLevel]>; // [min, max, severity]
  reversed?: boolean; // For self_esteem where higher is better
}

type SeverityLevel = "MINIMAL" | "MILD" | "MODERATE" | "SEVERE";

const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  depression: {
    max: 21, // 7 questions × 3 max
    cutoffs: [
      [0, 4, "MINIMAL"],
      [5, 9, "MILD"],
      [10, 14, "MODERATE"],
      [15, 21, "SEVERE"],
    ],
  },
  anxiety: {
    max: 21,
    cutoffs: [
      [0, 4, "MINIMAL"],
      [5, 9, "MILD"],
      [10, 14, "MODERATE"],
      [15, 21, "SEVERE"],
    ],
  },
  ptsd: {
    max: 21,
    cutoffs: [
      [0, 7, "MINIMAL"],
      [8, 12, "MILD"],
      [13, 17, "MODERATE"],
      [18, 21, "SEVERE"],
    ],
  },
  social_anxiety: {
    max: 21,
    cutoffs: [
      [0, 7, "MINIMAL"],
      [8, 12, "MILD"],
      [13, 17, "MODERATE"],
      [18, 21, "SEVERE"],
    ],
  },
  cognitive_distortion: {
    max: 21,
    cutoffs: [
      [0, 7, "MINIMAL"],
      [8, 12, "MILD"],
      [13, 17, "MODERATE"],
      [18, 21, "SEVERE"],
    ],
  },
  self_esteem: {
    max: 21,
    reversed: true, // Higher score = better self-esteem
    cutoffs: [
      [17, 21, "MINIMAL"], // High self-esteem
      [12, 16, "MILD"],
      [7, 11, "MODERATE"],
      [0, 6, "SEVERE"], // Low self-esteem
    ],
  },
  sleep_disruption: {
    max: 12, // 4 questions × 3 max
    cutoffs: [
      [0, 3, "MINIMAL"],
      [4, 6, "MILD"],
      [7, 9, "MODERATE"],
      [10, 12, "SEVERE"],
    ],
  },
  functional_impairment: {
    max: 12,
    cutoffs: [
      [0, 3, "MINIMAL"],
      [4, 6, "MILD"],
      [7, 9, "MODERATE"],
      [10, 12, "SEVERE"],
    ],
  },
};

// HiTOP-inspired cluster weights
// Maps domains to transdiagnostic symptom clusters
const CLUSTER_WEIGHTS = {
  distress: { depression: 0.6, self_esteem: 0.4 },
  fearAvoidance: { anxiety: 0.5, social_anxiety: 0.5 },
  traumaStress: { ptsd: 1.0 },
  cognitivePatterns: { cognitive_distortion: 1.0 },
  dailyFunctioning: { sleep_disruption: 0.5, functional_impairment: 0.5 },
} as const;

export interface ClusterProfile {
  distress: number;
  fearAvoidance: number;
  traumaStress: number;
  cognitivePatterns: number;
  dailyFunctioning: number;
  overallSeverity: SeverityLevel;
  requiresClinicalReview: boolean;
}

/**
 * Aggregate raw question responses into domain scores.
 */
function aggregateDomainScores(responses: Record<string, number>): Record<string, number> {
  const domainScores: Record<string, number> = {};

  for (const domain of Object.keys(DOMAIN_CONFIGS)) {
    domainScores[domain] = 0;
  }

  for (const [questionId, score] of Object.entries(responses)) {
    const domain = DOMAIN_MAP[questionId];
    if (domain && domain in domainScores) {
      domainScores[domain] += score;
    }
  }

  return domainScores;
}

/**
 * Normalize domain scores to 0-1 range.
 * For self_esteem, inverts the score since higher raw = better.
 */
function normalizeDomainScores(domainScores: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {};

  for (const [domain, score] of Object.entries(domainScores)) {
    const config = DOMAIN_CONFIGS[domain];
    if (config) {
      if (config.reversed) {
        // Invert: high raw score = low "distress-like" normalized value
        normalized[domain] = 1 - score / config.max;
      } else {
        normalized[domain] = score / config.max;
      }
      // Clamp to 0-1
      normalized[domain] = Math.max(0, Math.min(1, normalized[domain]));
    }
  }

  return normalized;
}

/**
 * Classify severity based on raw score and clinical cutoffs.
 */
function classifySeverity(score: number, cutoffs: Array<[number, number, SeverityLevel]>): SeverityLevel {
  for (const [min, max, severity] of cutoffs) {
    if (score >= min && score <= max) {
      return severity;
    }
  }
  return "MINIMAL";
}

/**
 * Determine overall severity from all domain severities.
 * Uses the highest severity across domains.
 */
function getOverallSeverity(severities: SeverityLevel[]): SeverityLevel {
  const order: SeverityLevel[] = ["MINIMAL", "MILD", "MODERATE", "SEVERE"];
  let maxIndex = 0;

  for (const severity of severities) {
    const index = order.indexOf(severity);
    if (index > maxIndex) {
      maxIndex = index;
    }
  }

  return order[maxIndex];
}

/**
 * Compute cluster scores from normalized domain scores using HiTOP weights.
 */
function computeClusterScores(normalized: Record<string, number>): Omit<ClusterProfile, "overallSeverity" | "requiresClinicalReview"> {
  const clusters: Record<string, number> = {};

  for (const [cluster, weights] of Object.entries(CLUSTER_WEIGHTS)) {
    let score = 0;
    for (const [domain, weight] of Object.entries(weights)) {
      score += (normalized[domain] ?? 0) * weight;
    }
    clusters[cluster] = Math.round(score * 1000) / 1000; // Round to 3 decimal places
  }

  return {
    distress: clusters.distress ?? 0,
    fearAvoidance: clusters.fearAvoidance ?? 0,
    traumaStress: clusters.traumaStress ?? 0,
    cognitivePatterns: clusters.cognitivePatterns ?? 0,
    dailyFunctioning: clusters.dailyFunctioning ?? 0,
  };
}

/**
 * Main function: Compute complete mental health profile from questionnaire responses.
 * This runs entirely client-side - no server calls needed.
 */
export function computeProfile(responses: Record<string, number>): ClusterProfile {
  // 1. Aggregate domain scores from individual responses
  const domainScores = aggregateDomainScores(responses);

  // 2. Normalize domain scores to 0-1
  const normalized = normalizeDomainScores(domainScores);

  // 3. Compute cluster scores using HiTOP weights
  const clusters = computeClusterScores(normalized);

  // 4. Determine severity for each domain
  const severities: SeverityLevel[] = [];
  for (const [domain, score] of Object.entries(domainScores)) {
    const config = DOMAIN_CONFIGS[domain];
    if (config) {
      severities.push(classifySeverity(score, config.cutoffs));
    }
  }

  // 5. Compute overall severity (highest across domains)
  const overallSeverity = getOverallSeverity(severities);

  // 6. Clinical review flag: 2+ severe domains or severe PTSD
  const severeCount = severities.filter((s) => s === "SEVERE").length;
  const ptsdSeverity = classifySeverity(domainScores.ptsd ?? 0, DOMAIN_CONFIGS.ptsd.cutoffs);
  const requiresClinicalReview = severeCount >= 2 || ptsdSeverity === "SEVERE";

  return {
    ...clusters,
    overallSeverity,
    requiresClinicalReview,
  };
}

/**
 * Compute cosine similarity between two cluster vectors.
 * Returns a score between 0 and 100.
 */
export function computeCosineSimilarity(userClusters: number[], groupClusters: number[]): number {
  if (userClusters.length !== groupClusters.length) {
    throw new Error("Cluster vectors must have the same length");
  }

  let dotProduct = 0;
  let userMagnitude = 0;
  let groupMagnitude = 0;

  for (let i = 0; i < userClusters.length; i++) {
    dotProduct += userClusters[i] * groupClusters[i];
    userMagnitude += userClusters[i] * userClusters[i];
    groupMagnitude += groupClusters[i] * groupClusters[i];
  }

  const magnitude = Math.sqrt(userMagnitude) * Math.sqrt(groupMagnitude);
  if (magnitude === 0) return 0;

  return Math.round((dotProduct / magnitude) * 100);
}
