/**
 * One place for what a mood label means.
 *
 * The set is closed and decided by the classifier in `agents/services/
 * diary_mood.py`. It was previously re-derived in three places: the sidebar
 * matched substrings inline, the chart kept its own capitalised map, and the
 * insights panel just printed the raw string. They disagreed. "hopeful" is a
 * real label the classifier returns and the chart had no entry for it, so a
 * hopeful day was plotted as flat neutral.
 */

/** Must stay in step with MOODS in agents/services/diary_mood.py. */
export const MOODS = [
    "happy",
    "hopeful",
    "calm",
    "neutral",
    "tired",
    "anxious",
    "sad",
    "angry",
] as const;

export type Mood = (typeof MOODS)[number];

interface MoodMeta {
    label: string;
    /** Position on the pleasant/unpleasant axis, for the trend line. */
    value: number;
    /** Tailwind classes for a chip. Legible in both themes. */
    chip: string;
    /** A bare colour for dots and the chart stroke. */
    dot: string;
}

const META: Record<Mood, MoodMeta> = {
    happy: {
        label: "Happy",
        value: 1,
        chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
        dot: "bg-emerald-500",
    },
    hopeful: {
        label: "Hopeful",
        value: 0.6,
        chip: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
        dot: "bg-teal-500",
    },
    calm: {
        label: "Calm",
        value: 0.4,
        chip: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
        dot: "bg-sky-500",
    },
    neutral: {
        label: "Neutral",
        value: 0,
        chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
        dot: "bg-slate-400",
    },
    tired: {
        label: "Tired",
        value: -0.3,
        chip: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
        dot: "bg-violet-400",
    },
    anxious: {
        label: "Anxious",
        value: -0.6,
        chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        dot: "bg-amber-500",
    },
    sad: {
        label: "Sad",
        value: -0.8,
        chip: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
        dot: "bg-blue-500",
    },
    angry: {
        label: "Angry",
        value: -1,
        chip: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
        dot: "bg-rose-500",
    },
};

const UNSCORED: MoodMeta = {
    label: "Not scored",
    value: 0,
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
};

export function isMood(value: string | null | undefined): value is Mood {
    return !!value && (MOODS as readonly string[]).includes(value);
}

/**
 * Everything the interface needs to render a label.
 *
 * An unrecognised or absent mood returns the "not scored" treatment rather
 * than a guess. The classifier already declines rather than inventing a label,
 * and that decision has to survive all the way to the screen.
 */
export function moodMeta(mood: string | null | undefined): MoodMeta {
    return isMood(mood) ? META[mood] : UNSCORED;
}
