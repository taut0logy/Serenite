import { describe, it, expect } from "vitest";
import { deriveOverallSeverity, evaluateRisk } from "@/lib/assessment/scoring";

describe("deriveOverallSeverity", () => {
    it("takes the worse of the PHQ-9 and GAD-7 bands", () => {
        expect(deriveOverallSeverity("MINIMAL", "SEVERE")).toBe("SEVERE");
        expect(deriveOverallSeverity("SEVERE", "MINIMAL")).toBe("SEVERE");
        expect(deriveOverallSeverity("MILD", "MODERATE")).toBe("MODERATE");
        expect(deriveOverallSeverity("MINIMAL", "MINIMAL")).toBe("MINIMAL");
    });

    it("maps PHQ-9's moderately-severe band up to SEVERE", () => {
        expect(deriveOverallSeverity("MODERATELY_SEVERE", "MINIMAL")).toBe("SEVERE");
    });
});

describe("evaluateRisk", () => {
    it("flags and escalates on a positive PHQ-9 item 9", () => {
        const risk = evaluateRisk({ phq9Item9: 1, freeTextRiskDetected: false, pcptsd5Raw: 0, phq9Raw: 5 });
        expect(risk.riskFlag).toBe(true);
        expect(risk.riskEscalated).toBe(true);
    });

    it("flags and escalates on a free-text risk disclosure", () => {
        const risk = evaluateRisk({ phq9Item9: 0, freeTextRiskDetected: true, pcptsd5Raw: 0, phq9Raw: 0 });
        expect(risk.riskFlag).toBe(true);
        expect(risk.riskEscalated).toBe(true);
    });

    it("escalates on the PC-PTSD-5 + PHQ-9 combination even with no direct signal", () => {
        const risk = evaluateRisk({ phq9Item9: 0, freeTextRiskDetected: false, pcptsd5Raw: 4, phq9Raw: 15 });
        expect(risk.riskEscalated).toBe(true);
    });

    it("does not escalate when only one half of the combination is elevated", () => {
        const risk = evaluateRisk({ phq9Item9: 0, freeTextRiskDetected: false, pcptsd5Raw: 4, phq9Raw: 10 });
        expect(risk.riskEscalated).toBe(false);
    });

    it("raises nothing when no trigger fires", () => {
        const risk = evaluateRisk({ phq9Item9: 0, freeTextRiskDetected: false, pcptsd5Raw: 0, phq9Raw: 3 });
        expect(risk.riskFlag).toBe(false);
        expect(risk.riskEscalated).toBe(false);
    });
});
