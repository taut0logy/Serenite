import { describe, it, expect } from "vitest";
import { selectNextItem, shouldStop } from "@/lib/assessment/cat";
import type { BankItem } from "@/lib/assessment/types";

function makeItem(id: string, contentTag: string, b: number[]): BankItem {
    return {
        id,
        domain: "depression",
        text: `item ${id}`,
        scaleId: "frequency4",
        contentTag,
        provenance: "OWN",
        isAnchor: false,
        isSafetyItem: false,
        status: "ACTIVE",
        params: { a: 1.5, b, source: "PROVISIONAL" },
    };
}

const BANK: BankItem[] = [
    makeItem("a", "mood", [-2, -1, 0]),
    makeItem("b", "mood", [-1.5, -0.5, 0.5]),
    makeItem("c", "sleep", [-1, 0, 1]),
    makeItem("d", "sleep", [-0.5, 0.5, 1.5]),
    makeItem("e", "appetite", [0, 1, 2]),
];

describe("selectNextItem", () => {
    it("never selects an already-administered item", () => {
        const administered = new Set(["a", "b"]);
        const picked = selectNextItem(BANK, administered, 0);
        expect(picked).not.toBeNull();
        expect(administered.has(picked!.id)).toBe(false);
    });

    it("returns null when the bank is exhausted", () => {
        const administered = new Set(BANK.map((i) => i.id));
        expect(selectNextItem(BANK, administered, 0)).toBeNull();
    });

    it("never picks two items with the same content tag back to back", () => {
        const administered = new Set<string>();
        const first = selectNextItem(BANK, administered, 0)!;
        administered.add(first.id);
        const second = selectNextItem(BANK, administered, 0)!;
        expect(second.contentTag).not.toBe(first.contentTag);
    });
});

describe("shouldStop", () => {
    it("does not stop before the minimum item count", () => {
        expect(shouldStop({ itemCount: 2, se: 0.1 })).toBe(false);
    });

    it("stops once precision target is met past the minimum", () => {
        expect(shouldStop({ itemCount: 4, se: 0.3 })).toBe(true);
    });

    it("stops at the maximum item count regardless of precision", () => {
        expect(shouldStop({ itemCount: 8, se: 5 })).toBe(true);
    });

    it("continues past the minimum when precision is not met", () => {
        expect(shouldStop({ itemCount: 5, se: 0.5 })).toBe(false);
    });
});
