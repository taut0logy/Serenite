"use server";

import { auth } from "@/auth";
import { classifyFreeText } from "@/lib/assessment/llm";
import type { ClassificationResult } from "@/lib/assessment/llm";

/**
 * Maps a free-text answer onto one of the item's own option indices.
 *
 * Risk detection is deliberately not here. It runs in the browser against
 * risk-patterns.ts, so a disclosure raises the crisis panel without waiting
 * on this call and without depending on it succeeding.
 */
export async function classifyFreeTextResponse(
    text: string,
    options: string[]
): Promise<{ success: boolean; result?: ClassificationResult; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    if (text.trim().length === 0) return { success: true, result: "UNCLEAR" };

    try {
        const result = await classifyFreeText(text, options);
        return { success: true, result };
    } catch {
        // An unavailable classifier must not consume the answer. UNCLEAR
        // re-presents the item, which is the same path a malformed reply takes.
        return { success: true, result: "UNCLEAR" };
    }
}
