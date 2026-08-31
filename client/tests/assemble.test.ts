import { describe, it, expect } from "vitest";
import { assembleResult } from "@/lib/assessment/assemble";
import { createSession, recordResponse, recordTraumaGate, recordPriorities,
    recordRiskDisclosure,
} from "@/lib/assessment/session";
import type { BankItem, DomainKey } from "@/lib/assessment/types";

function anchorItem(id: string, domain: DomainKey, provenance: "PHQ9" | "GAD7" | "PCPTSD5", isSafetyItem = false): BankItem {
    return {
        id,
        domain,
        text: id,
        scaleId: "frequency4",
        contentTag: id,
        provenance,
        isAnchor: true,
        isSafetyItem,
        status: "ACTIVE",
        params: { a: 2, b: [-1, 0, 1], source: "PROVISIONAL" },
    };
}

const BANKS: Record<DomainKey, BankItem[]> = {
    depression: [anchorItem("phq1", "depression", "PHQ9"), anchorItem("phq9", "depression", "PHQ9", true)],
    anxiety: [anchorItem("gad1", "anxiety", "GAD7")],
    trauma: [anchorItem("pt1", "trauma", "PCPTSD5"), anchorItem("pt2", "trauma", "PCPTSD5")],
    sleep: [],
    social: [],
    selfWorth: [],
};

const answer = (itemId: string, value: number) => ({ itemId, a: 2, b: [-1, 0, 1], value });

describe("assembleResult", () => {
    it("sums anchor raw scores per domain from administered responses", () => {
        let s = createSession();
        s = recordResponse(s, "depression", answer("phq1", 2));
        s = recordResponse(s, "depression", answer("phq9", 0));
        s = recordResponse(s, "anxiety", answer("gad1", 3));
        s = recordTraumaGate(s, false);
        s = recordPriorities(s, ["mood", "worry", "sleep", "connection", "selfCriticism"]);

        const result = assembleResult({
            banks: BANKS,
            session: s,
            parameterSetId: "ps-1",
        });

        expect(result.phq9Raw).toBe(2);
        expect(result.gad7Raw).toBe(3);
        expect(result.pcptsd5Raw).toBe(0);
        expect(result.traumaExposed).toBe(false);
        expect(result.priorities).toEqual(["mood", "worry", "sleep", "connection", "selfCriticism"]);
    });

    it("escalates risk when the safety item is endorsed", () => {
        let s = createSession();
        s = recordResponse(s, "depression", answer("phq1", 1));
        s = recordResponse(s, "depression", answer("phq9", 1));

        const result = assembleResult({
            banks: BANKS,
            session: s,
            parameterSetId: "ps-1",
        });

        expect(result.riskFlag).toBe(true);
        expect(result.riskEscalated).toBe(true);
    });

    it("carries the free-text risk signal through even with no other trigger", () => {
        const s = recordRiskDisclosure(createSession());
        const result = assembleResult({
            banks: BANKS,
            session: s,
            parameterSetId: "ps-1",
        });

        expect(result.riskEscalated).toBe(true);
    });
});
