// When a group's next session falls.
//
// A SupportGroup carries the recurring slot (a weekday, a time, a cadence) and
// each Meeting row is one occurrence of it. Nothing rolled the slot forward
// before, so a group materialised its first session and then never scheduled
// another. This is what advances it.

export type Weekday =
    | "SUNDAY"
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY";

export type Cadence = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

const DAY_INDEX: Record<Weekday, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
};

/** Minutes a session runs for. */
export const MEETING_DURATION_MINUTES = 60;

export interface Slot {
    dayOfWeek: Weekday | null;
    /** "HH:MM", 24 hour. */
    time: string | null;
    cadence: Cadence;
    /** Day of month, for MONTHLY groups. */
    dayOfMonth?: number | null;
}

function parseTime(time: string): { hours: number; minutes: number } | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return { hours, minutes };
}

/**
 * The first occurrence of `slot` strictly after `after`.
 *
 * Strictly after, so calling this with a session's own start time returns the
 * following one rather than the same one again. That is what makes it safe to
 * roll a schedule forward from the occurrence that just ended.
 *
 * Returns null when the group has no usable slot, which is a real state: a
 * group can exist before anyone has decided when it meets.
 */
export function nextOccurrence(slot: Slot, after: Date): Date | null {
    if (!slot.time) return null;
    const parsed = parseTime(slot.time);
    if (!parsed) return null;

    if (slot.cadence === "MONTHLY") {
        if (!slot.dayOfMonth) return null;
        return nextMonthly(slot.dayOfMonth, parsed, after);
    }

    if (!slot.dayOfWeek) return null;
    const stepDays = slot.cadence === "BIWEEKLY" ? 14 : 7;

    const candidate = new Date(after);
    candidate.setHours(parsed.hours, parsed.minutes, 0, 0);

    const target = DAY_INDEX[slot.dayOfWeek];
    let delta = target - candidate.getDay();
    if (delta < 0) delta += 7;
    candidate.setDate(candidate.getDate() + delta);

    // Landing on or before `after` means today's slot has already gone by.
    while (candidate.getTime() <= after.getTime()) {
        candidate.setDate(candidate.getDate() + stepDays);
    }

    return candidate;
}

function nextMonthly(
    dayOfMonth: number,
    time: { hours: number; minutes: number },
    after: Date
): Date {
    const candidate = new Date(after);
    candidate.setHours(time.hours, time.minutes, 0, 0);
    candidate.setDate(1);

    for (let i = 0; i < 24; i++) {
        // Months are not all the same length. Clamping to the last day keeps a
        // group that meets on the 31st from silently skipping February.
        const daysInMonth = new Date(
            candidate.getFullYear(),
            candidate.getMonth() + 1,
            0
        ).getDate();
        const day = Math.min(dayOfMonth, daysInMonth);

        const occurrence = new Date(candidate);
        occurrence.setDate(day);
        if (occurrence.getTime() > after.getTime()) return occurrence;

        candidate.setMonth(candidate.getMonth() + 1);
    }

    // Unreachable for any sane input; a fixed bound beats an unbounded loop.
    return candidate;
}

/** The window a session occupies, given when it starts. */
export function occurrenceWindow(startTime: Date): { startTime: Date; endTime: Date } {
    return {
        startTime,
        endTime: new Date(startTime.getTime() + MEETING_DURATION_MINUTES * 60_000),
    };
}
