"use server";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * The diary. Entries belong to this app; the AI service only ever holds
 * embeddings.
 *
 * The browser encrypts an entry under the member's master key and sends the
 * ciphertext here. Plaintext is forwarded once to the AI service, which
 * derives an embedding and a mood label and persists neither. At rest this
 * database holds ciphertext, a mood word and a timestamp, and the vector
 * collection holds a vector and two ids.
 *
 * Ownership comes from the session on every call. It used to be a query
 * parameter on an unauthenticated endpoint, which meant anyone who could
 * reach the AI service could read any member's diary by passing their id.
 */

const AI_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface EncryptedDiaryEntry {
    id: string;
    /** Base64 AES-GCM ciphertext. Only the member's browser can open it. */
    encryptedContent: string;
    iv: string;
    mood: string | null;
    confidence: number | null;
    entryDate: Date;
    createdAt: Date;
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function requireUserId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.id ?? null;
}

/**
 * The bearer token the AI service expects, read from the encrypted session
 * cookie on the server.
 *
 * Never taken as a parameter. The raw token is deliberately kept out of
 * `Session` so it cannot reach the browser, which is the same reason
 * `/api/proxy` exists; an action that accepted one from its caller would put
 * it back within reach of client code.
 */
async function accessToken(): Promise<string | null> {
    const store = await cookies();
    const jwt = await getToken({
        req: { headers: { cookie: store.toString() } } as never,
        secret: process.env.AUTH_SECRET!,
    });
    return (jwt?.accessToken as string | undefined) ?? null;
}

function toEntry(row: {
    id: string;
    encryptedContent: Uint8Array;
    iv: Uint8Array;
    mood: string | null;
    confidence: number | null;
    entryDate: Date;
    createdAt: Date;
}): EncryptedDiaryEntry {
    return {
        id: row.id,
        encryptedContent: Buffer.from(row.encryptedContent).toString("base64"),
        iv: Buffer.from(row.iv).toString("base64"),
        mood: row.mood,
        confidence: row.confidence,
        entryDate: row.entryDate,
        createdAt: row.createdAt,
    };
}

/**
 * Asks the AI service to embed and label an entry.
 *
 * Failure here is not failure to save. An entry the member has written is
 * kept whether or not it could be scored; it simply has no mood and does not
 * turn up in search until it is edited and re-indexed.
 */
async function indexEntry(
    entryId: string,
    plaintext: string,
    bearer: string
): Promise<{ mood: string; confidence: number } | null> {
    try {
        const response = await fetch(`${AI_BASE_URL}/diary/index`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${bearer}`,
            },
            body: JSON.stringify({ entry_id: entryId, content: plaintext }),
        });
        if (!response.ok) return null;
        const body = await response.json();
        return { mood: body.mood, confidence: body.confidence };
    } catch (error) {
        console.error("Diary indexing failed:", error);
        return null;
    }
}

export async function saveDiaryEntry(input: {
    /** Base64 ciphertext produced in the browser. */
    encryptedContent: string;
    iv: string;
    /** Sent for embedding and mood only. Never written to any store. */
    plaintext: string;
    entryDate: string;
    /** Present when editing, so the entry and its vector are replaced. */
    entryId?: string;
}): Promise<Result<EncryptedDiaryEntry>> {
    try {
        const userId = await requireUserId();
        if (!userId) return { success: false, error: "User not authenticated" };

        const data = {
            encryptedContent: Buffer.from(input.encryptedContent, "base64"),
            iv: Buffer.from(input.iv, "base64"),
            entryDate: new Date(input.entryDate),
        };

        // The row is written before indexing, so a slow or failing AI service
        // cannot cost somebody the thing they just wrote.
        const entry = input.entryId
            ? await prisma.diaryEntry.update({
                  // userId in the filter, not just the id: an id alone would
                  // let a crafted request edit another member's entry.
                  where: { id: input.entryId, userId },
                  data,
              })
            : await prisma.diaryEntry.create({ data: { ...data, userId } });

        const bearer = await accessToken();
        const analysis = bearer ? await indexEntry(entry.id, input.plaintext, bearer) : null;
        if (!analysis) return { success: true, data: toEntry(entry) };

        const scored = await prisma.diaryEntry.update({
            where: { id: entry.id },
            data: { mood: analysis.mood, confidence: analysis.confidence },
        });
        return { success: true, data: toEntry(scored) };
    } catch (error) {
        console.error("Error saving diary entry:", error);
        return { success: false, error: "Could not save your entry" };
    }
}

/** The member's entries, newest first. Ciphertext; the browser opens them. */
export async function listDiaryEntries(limit = 30): Promise<Result<EncryptedDiaryEntry[]>> {
    try {
        const userId = await requireUserId();
        if (!userId) return { success: false, error: "User not authenticated" };

        const rows = await prisma.diaryEntry.findMany({
            where: { userId },
            orderBy: { entryDate: "desc" },
            take: limit,
        });
        return { success: true, data: rows.map(toEntry) };
    } catch (error) {
        console.error("Error listing diary entries:", error);
        return { success: false, error: "Could not load your entries" };
    }
}

/**
 * Semantic search over the member's own entries.
 *
 * The AI service returns ids ranked by distance; the rows are then read here,
 * filtered by owner. Even a compromised index cannot surface somebody else's
 * entry, because the read is scoped to the session's user.
 */
export async function searchDiaryEntries(
    query: string,
    limit = 5
): Promise<Result<EncryptedDiaryEntry[]>> {
    try {
        const userId = await requireUserId();
        if (!userId) return { success: false, error: "User not authenticated" };
        if (query.trim().length === 0) return { success: true, data: [] };

        const bearer = await accessToken();
        if (!bearer) return { success: false, error: "Please sign in again" };

        const response = await fetch(`${AI_BASE_URL}/diary/search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${bearer}`,
            },
            body: JSON.stringify({ query, limit }),
        });
        if (!response.ok) return { success: false, error: "Search is unavailable right now" };

        const matches: { entry_id: string; score: number }[] = await response.json();
        if (matches.length === 0) return { success: true, data: [] };

        const rows = await prisma.diaryEntry.findMany({
            where: { userId, id: { in: matches.map((m) => m.entry_id) } },
        });

        // Restore the ranking the search produced; findMany does not preserve
        // the order of an `in` list.
        const rank = new Map(matches.map((m, i) => [m.entry_id, i]));
        rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

        return { success: true, data: rows.map(toEntry) };
    } catch (error) {
        console.error("Error searching diary entries:", error);
        return { success: false, error: "Could not search your entries" };
    }
}

export async function deleteDiaryEntry(entryId: string): Promise<Result<null>> {
    try {
        const userId = await requireUserId();
        if (!userId) return { success: false, error: "User not authenticated" };

        const deleted = await prisma.diaryEntry.deleteMany({ where: { id: entryId, userId } });
        if (deleted.count === 0) return { success: false, error: "Entry not found" };

        // Best effort. A vector left behind holds no content and matches an
        // entry that no longer resolves, so it is dropped from results anyway.
        try {
            const bearer = await accessToken();
            if (bearer) {
                await fetch(`${AI_BASE_URL}/diary/index/${entryId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${bearer}` },
                });
            }
        } catch (error) {
            console.error("Could not drop diary vector:", error);
        }

        return { success: true, data: null };
    } catch (error) {
        console.error("Error deleting diary entry:", error);
        return { success: false, error: "Could not delete the entry" };
    }
}
