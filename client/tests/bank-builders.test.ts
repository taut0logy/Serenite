import { describe, it, expect } from "vitest";
import { thresholds, ownItem, anchorItem } from "@/lib/assessment/bank-builders";

describe("thresholds", () => {
    it("spaces k-1 thresholds evenly around the center for k categories", () => {
        expect(thresholds(0, 4)).toEqual([-0.9, 0, 0.9]);
        expect(thresholds(0.5, 2)).toEqual([0.5]);
    });

    it("always returns a strictly increasing array", () => {
        const b = thresholds(-1.2, 4);
        for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1]);
    });
});

describe("ownItem", () => {
    it("builds a provisional, non-anchor, non-safety item", () => {
        const item = ownItem("dep_o1", "depression", "text", "anhedonia", -1, 4);
        expect(item.provenance).toBe("OWN");
        expect(item.isAnchor).toBe(false);
        expect(item.isSafetyItem).toBe(false);
        expect(item.status).toBe("ACTIVE");
        expect(item.params.source).toBe("PROVISIONAL");
        expect(item.params.b).toHaveLength(3);
    });
});

describe("anchorItem", () => {
    it("builds an anchor item flagged for its source instrument", () => {
        const item = anchorItem("phq1", "depression", "text", "anhedonia", "PHQ9", -1, 4);
        expect(item.isAnchor).toBe(true);
        expect(item.provenance).toBe("PHQ9");
    });

    it("supports marking an item as a safety item", () => {
        const item = anchorItem("phq9", "depression", "text", "suicidality", "PHQ9", 1, 4, true);
        expect(item.isSafetyItem).toBe(true);
    });
});
