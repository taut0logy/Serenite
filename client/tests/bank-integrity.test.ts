import { describe, it, expect } from "vitest";
import { ALL_BANKS, BANKS_BY_DOMAIN } from "@/lib/assessment/banks";

describe("item banks", () => {
    it("has no duplicate item ids across all domains", () => {
        const ids = ALL_BANKS.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("keeps every item's domain consistent with the bank it is stored under", () => {
        for (const [domain, items] of Object.entries(BANKS_BY_DOMAIN)) {
            for (const item of items) expect(item.domain).toBe(domain);
        }
    });

    it("gives every item strictly increasing thresholds", () => {
        for (const item of ALL_BANKS) {
            for (let i = 1; i < item.params.b.length; i++) {
                expect(item.params.b[i]).toBeGreaterThan(item.params.b[i - 1]);
            }
        }
    });

    it("has exactly one safety item, in the depression domain", () => {
        const safetyItems = ALL_BANKS.filter((i) => i.isSafetyItem);
        expect(safetyItems).toHaveLength(1);
        expect(safetyItems[0].domain).toBe("depression");
    });

    it("has the expected anchor counts per domain", () => {
        const anchorCount = (domain: string) =>
            BANKS_BY_DOMAIN[domain as keyof typeof BANKS_BY_DOMAIN].filter((i) => i.isAnchor).length;
        expect(anchorCount("depression")).toBe(9); // PHQ-9
        expect(anchorCount("anxiety")).toBe(7); // GAD-7
        expect(anchorCount("trauma")).toBe(5); // PC-PTSD-5
        expect(anchorCount("sleep")).toBe(0);
        expect(anchorCount("social")).toBe(0);
        expect(anchorCount("selfWorth")).toBe(0);
    });

    it("keeps trauma items binary and every other domain 4-category", () => {
        for (const item of BANKS_BY_DOMAIN.trauma) expect(item.params.b).toHaveLength(1);
        for (const domain of ["depression", "anxiety", "sleep", "social", "selfWorth"] as const) {
            for (const item of BANKS_BY_DOMAIN[domain]) expect(item.params.b).toHaveLength(3);
        }
    });
});
