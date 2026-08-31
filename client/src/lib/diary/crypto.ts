import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    base64ToUint8Array,
    decryptWithMK,
    encryptWithMK,
} from "@/lib/key-management";
import { uint8ArrayToBase64 } from "@/lib/encryption";
import type { EncryptedDiaryEntry } from "@/actions/diary.actions";

/**
 * Sealing and opening diary entries in the browser.
 *
 * Uses the same master key the assessment does, so a member has one vault
 * rather than two, and unlocking once covers both. The key never leaves the
 * browser: what reaches the server is ciphertext it has no way to open.
 */

export interface OpenDiaryEntry {
    id: string;
    content: string;
    mood: string | null;
    confidence: number | null;
    entryDate: Date;
    createdAt: Date;
}

export async function sealEntry(
    content: string,
    masterKey: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
    const { encrypted, iv } = await encryptWithMK(content, masterKey);
    return {
        encryptedContent: arrayBufferToBase64(encrypted),
        iv: uint8ArrayToBase64(iv),
    };
}

/**
 * Opens one entry, or returns null if it cannot be opened.
 *
 * Null rather than a throw because a single unreadable entry should not take
 * the whole diary down with it. That happens for a real reason: an entry
 * written before a password reset was sealed under a master key the member no
 * longer holds, and no amount of retrying will recover it.
 */
export async function openEntry(
    entry: EncryptedDiaryEntry,
    masterKey: CryptoKey
): Promise<OpenDiaryEntry | null> {
    try {
        const content = await decryptWithMK<string>(
            base64ToArrayBuffer(entry.encryptedContent),
            base64ToUint8Array(entry.iv),
            masterKey
        );
        return {
            id: entry.id,
            content,
            mood: entry.mood,
            confidence: entry.confidence,
            entryDate: new Date(entry.entryDate),
            createdAt: new Date(entry.createdAt),
        };
    } catch {
        return null;
    }
}

/** Opens a list, dropping the entries that cannot be read. */
export async function openEntries(
    entries: EncryptedDiaryEntry[],
    masterKey: CryptoKey
): Promise<{ opened: OpenDiaryEntry[]; unreadable: number }> {
    const results = await Promise.all(entries.map((entry) => openEntry(entry, masterKey)));
    const opened = results.filter((entry): entry is OpenDiaryEntry => entry !== null);
    return { opened, unreadable: results.length - opened.length };
}
