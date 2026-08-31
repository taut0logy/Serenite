import { describe, it, expect } from "vitest";
import { scorePHQ9, scoreGAD7, scorePCPTSD5 } from "@/lib/assessment/anchors";

describe("scorePHQ9", () => {
    const nine = (v: number) => Array(9).fill(v);

    it("bands at each published PHQ-9 cutpoint", () => {
        expect(scorePHQ9(nine(0)).band).toBe("MINIMAL");
        expect(scorePHQ9([1, 1, 1, 1, 1, 0, 0, 0, 0]).band).toBe("MILD"); // raw 5
        expect(scorePHQ9([2, 2, 2, 2, 2, 0, 0, 0, 0]).band).toBe("MODERATE"); // raw 10
        expect(scorePHQ9([2, 2, 2, 2, 2, 2, 2, 1, 0]).band).toBe("MODERATELY_SEVERE"); // raw 15
        expect(scorePHQ9(nine(3)).band).toBe("SEVERE"); // raw 27
    });

    it("sums raw responses", () => {
        expect(scorePHQ9(nine(1)).raw).toBe(9);
    });
});

describe("scoreGAD7", () => {
    const seven = (v: number) => Array(7).fill(v);

    it("bands at each published GAD-7 cutpoint", () => {
        expect(scoreGAD7(seven(0)).band).toBe("MINIMAL");
        expect(scoreGAD7([1, 1, 1, 1, 1, 0, 0]).band).toBe("MILD"); // raw 5
        expect(scoreGAD7([2, 2, 2, 2, 2, 0, 0]).band).toBe("MODERATE"); // raw 10
        expect(scoreGAD7(seven(3)).band).toBe("SEVERE"); // raw 21
    });
});

describe("scorePCPTSD5", () => {
    it("counts endorsed items", () => {
        expect(scorePCPTSD5([1, 0, 0, 0, 0]).raw).toBe(1);
        expect(scorePCPTSD5([1, 1, 1, 1, 1]).raw).toBe(5);
    });

    it("flags a positive screen at the published cutoff of 3", () => {
        expect(scorePCPTSD5([1, 1, 1, 0, 0]).positiveScreen).toBe(true);
        expect(scorePCPTSD5([1, 1, 0, 0, 0]).positiveScreen).toBe(false);
    });
});
