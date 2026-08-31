import { describe, it, expect } from "vitest";
import { isSafetyItemEndorsed } from "@/lib/assessment/scoring";
import type { BankItem } from "@/lib/assessment/types";

function item(overrides: Partial<BankItem> = {}): BankItem {
    return {
        id: "phq9",
        domain: "depression",
        text: "text",
        scaleId: "frequency4",
        contentTag: "suicidality",
        provenance: "PHQ9",
        isAnchor: true,
        isSafetyItem: true,
        status: "ACTIVE",
        params: { a: 1, b: [0], source: "PROVISIONAL" },
        ...overrides,
    };
}

describe("isSafetyItemEndorsed", () => {
    it("is true when a safety item is answered above zero", () => {
        expect(isSafetyItemEndorsed(item(), 1)).toBe(true);
        expect(isSafetyItemEndorsed(item(), 3)).toBe(true);
    });

    it("is false when a safety item is answered at zero", () => {
        expect(isSafetyItemEndorsed(item(), 0)).toBe(false);
    });

    it("is false for a non-safety item regardless of value", () => {
        expect(isSafetyItemEndorsed(item({ isSafetyItem: false }), 3)).toBe(false);
    });
});
