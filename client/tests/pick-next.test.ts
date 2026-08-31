import { describe, it, expect } from "vitest";
import { pickNext } from "@/lib/assessment/cat";
import type { DomainPolicy } from "@/lib/assessment/policy";
import type { AdministeredResponse, BankItem } from "@/lib/assessment/types";

function item(id: string, opts: Partial<BankItem> = {}): BankItem {
    return {
        id,
        domain: "depression",
        text: id,
        scaleId: "frequency4",
        contentTag: id,
        provenance: "OWN",
        isAnchor: false,
        isSafetyItem: false,
        status: "ACTIVE",
        params: { a: 1.5, b: [-1, 0, 1], source: "PROVISIONAL" },
        ...opts,
    };
}

const BANK: BankItem[] = [
    item("anchor1", { isAnchor: true, provenance: "PHQ9" }),
    item("anchor2", { isAnchor: true, provenance: "PHQ9" }),
    item("safety", { isSafetyItem: true, isAnchor: true, provenance: "PHQ9" }),
    ...Array.from({ length: 8 }, (_, i) => item(`own${i + 1}`)),
];

const answered = (itemId: string, value = 1): AdministeredResponse => ({
    itemId,
    a: 1.5,
    b: [-1, 0, 1],
    value,
});

const POLICY: DomainPolicy = {
    targetSe: 0.32,
    minAdaptiveItems: 4,
    maxAdaptiveItems: 8,
};

describe("pickNext", () => {
    it("returns forced items before any adaptive item, in bank order", () => {
        expect(pickNext(BANK, [], POLICY)?.id).toBe("anchor1");
        expect(pickNext(BANK, [answered("anchor1")], POLICY)?.id).toBe("anchor2");
        expect(pickNext(BANK, [answered("anchor1"), answered("anchor2")], POLICY)?.id).toBe("safety");
    });

    it("moves to adaptive selection once all forced items are administered", () => {
        const administered = [answered("anchor1"), answered("anchor2"), answered("safety")];
        const next = pickNext(BANK, administered, POLICY);
        expect(next).not.toBeNull();
        expect(next!.isAnchor).toBe(false);
    });

    it("stops once the adaptive item cap is reached, regardless of precision", () => {
        const administered = [
            answered("anchor1"),
            answered("anchor2"),
            answered("safety"),
            ...Array.from({ length: 8 }, (_, i) => answered(`own${i + 1}`)),
        ];
        expect(pickNext(BANK, administered, POLICY)).toBeNull();
    });

    it("returns null once the bank is fully exhausted", () => {
        const administered = BANK.map((i) => answered(i.id));
        expect(pickNext(BANK, administered, POLICY)).toBeNull();
    });
});
