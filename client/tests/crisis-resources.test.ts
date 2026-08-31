import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CRISIS_RESOURCES, dialable } from "@/lib/crisis";
import { detectRiskDisclosure } from "@/lib/assessment/risk-patterns";

const CANONICAL = resolve(__dirname, "../src/lib/crisis/resources.json");
const AGENTS_COPY = resolve(__dirname, "../../agents/config/crisis_resources.json");

describe("the two copies of the crisis data", () => {
    /**
     * The AI service and the interface are separate deployables, so each ships
     * its own copy. This is what keeps that safe. The failure being guarded
     * against is somebody correcting a number in one file and leaving the
     * other pointing at a line that no longer answers.
     */
    it("are byte-identical", () => {
        const canonical = readFileSync(CANONICAL, "utf8");
        const copy = readFileSync(AGENTS_COPY, "utf8");
        expect(copy).toBe(canonical);
    });
});

describe("crisis resources", () => {
    it("lists at least one line that always answers", () => {
        expect(CRISIS_RESOURCES.some((r) => r.alwaysOpen)).toBe(true);
    });

    it("leads with emergency, then the crisis line, then general health", () => {
        expect(CRISIS_RESOURCES.map((r) => r.kind)).toEqual(["emergency", "crisis", "health"]);
    });

    it("never puts a general health line above the crisis line", () => {
        const crisis = CRISIS_RESOURCES.findIndex((r) => r.kind === "crisis");
        const health = CRISIS_RESOURCES.findIndex((r) => r.kind === "health");
        expect(crisis).toBeLessThan(health);
    });

    it("states hours for every entry, so none reads as always open by omission", () => {
        for (const resource of CRISIS_RESOURCES) {
            expect(resource.hours.trim().length).toBeGreaterThan(0);
        }
    });

    it("says what each line is for, since not all of them are crisis lines", () => {
        for (const resource of CRISIS_RESOURCES) {
            expect(resource.purpose.trim().length).toBeGreaterThan(0);
        }
    });

    it("cites a source for every number, so each can be re-verified", () => {
        for (const resource of CRISIS_RESOURCES) {
            expect(resource.source).toMatch(/^https?:\/\//);
        }
    });

    it("carries no United States numbers, which would connect nobody here", () => {
        const numbers = CRISIS_RESOURCES.map((r) => dialable(r.number));
        expect(numbers).not.toContain("988");
        expect(numbers).not.toContain("911");
        expect(numbers).not.toContain("741741");
    });

    it("produces a dialable string for every number", () => {
        for (const resource of CRISIS_RESOURCES) {
            expect(dialable(resource.number)).toMatch(/^\+?\d+$/);
        }
    });
});

describe("risk patterns, shared with the AI service", () => {
    it("catches explicit disclosures", () => {
        const disclosures = [
            "I want to kill myself",
            "I have been thinking about ending my life",
            "everyone would be better off dead",
            "I don't want to live anymore",
            "I keep cutting myself",
            "I have been feeling suicidal",
            "there is no reason to go on",
            "I want to take my own life",
        ];
        for (const text of disclosures) {
            expect(detectRiskDisclosure(text), text).toBe(true);
        }
    });

    it("is case insensitive", () => {
        expect(detectRiskDisclosure("I WANT TO DIE")).toBe(true);
    });

    it("does not fire on ordinary distress", () => {
        const benign = [
            "work has been really stressful lately",
            "I am tired of my commute",
            "this deadline is killing me",
            "I could die of embarrassment",
            "my phone battery died",
        ];
        for (const text of benign) {
            expect(detectRiskDisclosure(text), text).toBe(false);
        }
    });
});
