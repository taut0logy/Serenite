/**
 * A diary entry as the interface sees it: already decrypted, in memory, in the
 * member's own browser.
 *
 * `entryDate` is a real Date rather than a "dd-MM-yyyy" string. The previous
 * shape carried the date as text and each component reparsed it with its own
 * hand-rolled helper that returned the current date whenever parsing failed,
 * so a malformed date silently became today.
 *
 * There is no written analysis field any more. It held a sentence or two
 * quoting and paraphrasing the entry, stored in clear beside the vector, which
 * gave back most of what encrypting the entry was meant to protect.
 */
export interface DiaryEntryView {
    id: string;
    content: string;
    mood: string | null;
    confidence: number | null;
    entryDate: Date;
    createdAt: Date;
}

/** The mood label for the entry being written, before it is saved. */
export interface MoodView {
    mood: string;
    confidence: number;
}
