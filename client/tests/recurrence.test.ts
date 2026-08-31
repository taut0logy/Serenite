import { describe, it, expect } from "vitest";
import { nextOccurrence, occurrenceWindow, type Slot } from "@/lib/meeting/recurrence";

// A Wednesday.
const WED_NOON = new Date(2026, 8, 2, 12, 0, 0, 0);

const slot = (over: Partial<Slot> = {}): Slot => ({
    dayOfWeek: "FRIDAY",
    time: "18:00",
    cadence: "WEEKLY",
    ...over,
});

describe("nextOccurrence, weekly", () => {
    it("finds the coming weekday", () => {
        const next = nextOccurrence(slot(), WED_NOON)!;
        expect(next.getDay()).toBe(5);
        expect(next.getDate()).toBe(4);
        expect(next.getHours()).toBe(18);
    });

    it("returns today's slot when it is still ahead", () => {
        const next = nextOccurrence(slot({ dayOfWeek: "WEDNESDAY" }), WED_NOON)!;
        expect(next.getDate()).toBe(2);
        expect(next.getHours()).toBe(18);
    });

    it("skips to next week when today's slot has passed", () => {
        const evening = new Date(2026, 8, 2, 19, 0, 0, 0);
        const next = nextOccurrence(slot({ dayOfWeek: "WEDNESDAY" }), evening)!;
        expect(next.getDate()).toBe(9);
    });

    it("is strictly after, so rolling forward from a session never returns it again", () => {
        const start = nextOccurrence(slot(), WED_NOON)!;
        const following = nextOccurrence(slot(), start)!;
        expect(following.getTime()).toBeGreaterThan(start.getTime());
        expect(following.getDate()).toBe(11);
    });
});

describe("nextOccurrence, biweekly", () => {
    it("steps a fortnight when rolling forward", () => {
        const first = nextOccurrence(slot({ cadence: "BIWEEKLY" }), WED_NOON)!;
        const second = nextOccurrence(slot({ cadence: "BIWEEKLY" }), first)!;
        const days = (second.getTime() - first.getTime()) / 86_400_000;
        expect(days).toBe(14);
    });
});

describe("nextOccurrence, monthly", () => {
    const monthly = (dayOfMonth: number): Slot => ({
        dayOfWeek: null,
        time: "18:00",
        cadence: "MONTHLY",
        dayOfMonth,
    });

    it("finds the coming day of the month", () => {
        const next = nextOccurrence(monthly(20), WED_NOON)!;
        expect(next.getMonth()).toBe(8);
        expect(next.getDate()).toBe(20);
    });

    it("rolls into next month once the day has passed", () => {
        const next = nextOccurrence(monthly(1), WED_NOON)!;
        expect(next.getMonth()).toBe(9);
        expect(next.getDate()).toBe(1);
    });

    it("clamps to the last day rather than skipping a short month", () => {
        const lateJan = new Date(2026, 0, 31, 19, 0, 0, 0);
        const next = nextOccurrence(monthly(31), lateJan)!;
        expect(next.getMonth()).toBe(1);
        expect(next.getDate()).toBe(28);
    });
});

describe("nextOccurrence, incomplete slots", () => {
    it("returns null with no time set", () => {
        expect(nextOccurrence(slot({ time: null }), WED_NOON)).toBeNull();
    });

    it("returns null with no weekday on a weekly group", () => {
        expect(nextOccurrence(slot({ dayOfWeek: null }), WED_NOON)).toBeNull();
    });

    it("returns null on a malformed time rather than guessing", () => {
        expect(nextOccurrence(slot({ time: "25:00" }), WED_NOON)).toBeNull();
        expect(nextOccurrence(slot({ time: "evening" }), WED_NOON)).toBeNull();
    });

    it("returns null for a monthly group with no day of month", () => {
        expect(nextOccurrence(slot({ cadence: "MONTHLY", dayOfWeek: null }), WED_NOON)).toBeNull();
    });
});

describe("occurrenceWindow", () => {
    it("runs an hour from the start", () => {
        const { startTime, endTime } = occurrenceWindow(WED_NOON);
        expect(endTime.getTime() - startTime.getTime()).toBe(60 * 60 * 1000);
    });
});
