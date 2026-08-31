import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { openEntries, openEntry, sealEntry } from "@/lib/diary/crypto";
import type { EncryptedDiaryEntry } from "@/actions/diary.actions";

// vitest runs these in node, where globalThis.crypto may be absent.
if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

async function makeKey(): Promise<CryptoKey> {
    return webcrypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    ) as Promise<CryptoKey>;
}

function asStored(
    sealed: { encryptedContent: string; iv: string },
    over: Partial<EncryptedDiaryEntry> = {}
): EncryptedDiaryEntry {
    return {
        id: "entry-1",
        encryptedContent: sealed.encryptedContent,
        iv: sealed.iv,
        mood: "calm",
        confidence: 0.8,
        entryDate: new Date("2026-09-01"),
        createdAt: new Date("2026-09-01"),
        ...over,
    };
}

describe("diary crypto", () => {
    it("round-trips an entry", async () => {
        const key = await makeKey();
        const content = "Today was quieter. I sat outside for a while.";
        const opened = await openEntry(asStored(await sealEntry(content, key)), key);
        expect(opened?.content).toBe(content);
    });

    it("produces ciphertext that does not contain the plaintext", async () => {
        const key = await makeKey();
        const sealed = await sealEntry("I felt hollow again today.", key);
        const raw = Buffer.from(sealed.encryptedContent, "base64").toString("utf8");
        expect(raw).not.toContain("hollow");
    });

    it("uses a fresh iv per entry, so identical text seals differently", async () => {
        const key = await makeKey();
        const a = await sealEntry("the same words", key);
        const b = await sealEntry("the same words", key);
        expect(a.iv).not.toBe(b.iv);
        expect(a.encryptedContent).not.toBe(b.encryptedContent);
    });

    it("survives newlines, markup and non-latin text", async () => {
        const key = await makeKey();
        const content = "<p>দুশ্চিন্তা</p>\n\n<em>still here</em> — 😞";
        const opened = await openEntry(asStored(await sealEntry(content, key)), key);
        expect(opened?.content).toBe(content);
    });

    it("returns null for an entry sealed under a different key", async () => {
        const sealed = await sealEntry("private", await makeKey());
        const opened = await openEntry(asStored(sealed), await makeKey());
        expect(opened).toBeNull();
    });

    it("returns null on tampered ciphertext rather than yielding altered text", async () => {
        const key = await makeKey();
        const sealed = await sealEntry("the original words", key);
        const bytes = Buffer.from(sealed.encryptedContent, "base64");
        bytes[4] ^= 0xff;
        const opened = await openEntry(
            asStored({ ...sealed, encryptedContent: bytes.toString("base64") }),
            key
        );
        expect(opened).toBeNull();
    });

    it("carries the derived fields through untouched", async () => {
        const key = await makeKey();
        const stored = asStored(await sealEntry("x", key), { mood: "anxious", confidence: 0.42 });
        const opened = await openEntry(stored, key);
        expect(opened?.mood).toBe("anxious");
        expect(opened?.confidence).toBe(0.42);
    });

    it("drops unreadable entries without losing the readable ones", async () => {
        const key = await makeKey();
        const mine = asStored(await sealEntry("mine", key), { id: "a" });
        const theirs = asStored(await sealEntry("theirs", await makeKey()), { id: "b" });

        const { opened, unreadable } = await openEntries([mine, theirs], key);
        expect(opened).toHaveLength(1);
        expect(opened[0].content).toBe("mine");
        expect(unreadable).toBe(1);
    });
});
