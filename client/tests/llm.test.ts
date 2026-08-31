import { describe, it, expect } from "vitest";
import { parseClassification } from "@/lib/assessment/llm";
import { detectRiskDisclosure } from "@/lib/assessment/risk-patterns";

describe("parseClassification", () => {
    it("accepts a bare digit within range", () => {
        expect(parseClassification("2", 4)).toBe(2);
    });

    it("extracts the first number from surrounding text", () => {
        expect(parseClassification("I'd say option 1", 4)).toBe(1);
    });

    it("returns UNCLEAR when the value is out of range", () => {
        expect(parseClassification("4", 4)).toBe("UNCLEAR");
        expect(parseClassification("-1", 4)).toBe("UNCLEAR");
    });

    it("returns UNCLEAR when there is no number at all", () => {
        expect(parseClassification("not sure", 4)).toBe("UNCLEAR");
    });

    it("returns UNCLEAR on empty input", () => {
        expect(parseClassification("", 4)).toBe("UNCLEAR");
    });
});

describe("detectRiskDisclosure", () => {
    it("flags direct statements of self-harm intent", () => {
        expect(detectRiskDisclosure("I want to kill myself")).toBe(true);
        expect(detectRiskDisclosure("sometimes I think everyone would be better off dead")).toBe(true);
        expect(detectRiskDisclosure("I've been cutting myself again")).toBe(true);
    });

    it("is case-insensitive", () => {
        expect(detectRiskDisclosure("I WANT TO END MY LIFE")).toBe(true);
    });

    it("does not flag unrelated text", () => {
        expect(detectRiskDisclosure("I've been sleeping better this week")).toBe(false);
        expect(detectRiskDisclosure("work has been killing me lately")).toBe(false);
    });
});
