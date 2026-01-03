// client/src/lib/symptom-clusters.ts

export const SYMPTOM_CLUSTERS = {
  // Emotional Regulation
  emotional_dysregulation: {
    domains: ["depression", "anxiety", "cognitive_distortion"],
    indicators: {
      depression: { min: 10, max: 27 },
      anxiety: { min: 10, max: 21 },
      cognitive_distortion: { min: 15, max: 21 }
    },
    description: "Difficulty managing emotional responses"
  },
  
  // Social Functioning
  social_impairment: {
    domains: ["social_anxiety", "functional_impairment"],
    indicators: {
      social_anxiety: { min: 21, max: 80 },
      functional_impairment: { min: 4, max: 12 }
    },
    description: "Challenges in interpersonal relationships and social situations"
  },
  
  // Trauma Response
  trauma_response: {
    domains: ["ptsd", "anxiety", "sleep_disruption"],
    indicators: {
      ptsd: { min: 31, max: 80 },
      anxiety: { min: 10, max: 21 },
      sleep_disruption: { min: 4, max: 12 }
    },
    description: "Post-traumatic stress and hyperarousal"
  },
  
  // Negative Self-Perception
  self_concept_deficit: {
    domains: ["self_esteem", "depression", "cognitive_distortion"],
    indicators: {
      self_esteem: { min: 0, max: 14 },  // Low self-esteem
      depression: { min: 5, max: 27 },
      cognitive_distortion: { min: 15, max: 21 }
    },
    description: "Negative beliefs about self-worth and identity"
  },
  
  // Physiological Dysregulation
  somatic_disruption: {
    domains: ["sleep_disruption", "functional_impairment", "anxiety"],
    indicators: {
      sleep_disruption: { min: 4, max: 12 },
      functional_impairment: { min: 4, max: 12 },
      anxiety: { min: 5, max: 21 }
    },
    description: "Physical manifestations of psychological distress"
  },
  
  // Anhedonia & Motivation
  motivational_deficit: {
    domains: ["depression", "functional_impairment"],
    indicators: {
      depression: { min: 10, max: 27 },
      functional_impairment: { min: 4, max: 12 }
    },
    description: "Loss of interest and difficulty with daily activities"
  },
  
  // Worry & Rumination
  cognitive_perseveration: {
    domains: ["anxiety", "cognitive_distortion", "depression"],
    indicators: {
      anxiety: { min: 10, max: 21 },
      cognitive_distortion: { min: 15, max: 21 },
      depression: { min: 5, max: 27 }
    },
    description: "Persistent negative thought patterns"
  }
} as const;

export type SymptomCluster = keyof typeof SYMPTOM_CLUSTERS;
