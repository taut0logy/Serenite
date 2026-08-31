import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MOODS, isMood, moodMeta } from "@/lib/diary/mood";

const CLASSIFIER = resolve(__dirname, "../../agents/services/diary_mood.py");

describe("the mood set, shared with the classifier", () => {
    /**
     * The labels are produced in Python and rendered in TypeScript. Nothing at
     * runtime connects the two lists, so this is what connects them. A label
     * the interface does not know about falls through to "Not scored", which
     * looks exactly like the analyser having failed rather than the two files
     * having drifted.
     */
    it("matches MOODS in agents/services/diary_mood.py", () => {
        const source = readFileSync(CLASSIFIER, "utf8");
        const match = source.match(/^MOODS\s*=\s*\(([^)]*)\)/m);
        expect(match, "could not find MOODS in the classifier").not.toBeNull();

        const fromPython = [...match![1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);

        expect(fromPython.length).toBeGreaterThan(0);
        expect([...MOODS].sort()).toEqual([...fromPython].sort());
    });
});

describe("moodMeta", () => {
    it("gives every known mood a label, a colour and a position", () => {
        for (const mood of MOODS) {
            const meta = moodMeta(mood);
            expect(meta.label.length, mood).toBeGreaterThan(0);
            expect(meta.chip.length, mood).toBeGreaterThan(0);
            expect(meta.dot.length, mood).toBeGreaterThan(0);
            expect(meta.value, mood).toBeGreaterThanOrEqual(-1);
            expect(meta.value, mood).toBeLessThanOrEqual(1);
        }
    });

    it("treats an absent mood as not scored rather than neutral", () => {
        // The classifier declines instead of guessing; that has to survive all
        // the way to the screen, or a refusal reads as a reading of "neutral".
        expect(moodMeta(null).label).toBe("Not scored");
        expect(moodMeta(undefined).label).toBe("Not scored");
    });

    it("does not invent a treatment for a label it does not know", () => {
        expect(moodMeta("ecstatic").label).toBe("Not scored");
        expect(moodMeta("").label).toBe("Not scored");
    });

    it("orders pleasant moods above hard ones, which is what the trend line reads", () => {
        expect(moodMeta("happy").value).toBeGreaterThan(moodMeta("calm").value);
        expect(moodMeta("calm").value).toBeGreaterThan(moodMeta("neutral").value);
        expect(moodMeta("neutral").value).toBeGreaterThan(moodMeta("anxious").value);
        expect(moodMeta("anxious").value).toBeGreaterThan(moodMeta("angry").value);
    });

    it("puts neutral at the midpoint, so the zero line means something", () => {
        expect(moodMeta("neutral").value).toBe(0);
    });
});

describe("isMood", () => {
    it("accepts the closed set and nothing else", () => {
        expect(isMood("happy")).toBe(true);
        expect(isMood("Happy")).toBe(false);
        expect(isMood("delighted")).toBe(false);
        expect(isMood(null)).toBe(false);
    });
});
