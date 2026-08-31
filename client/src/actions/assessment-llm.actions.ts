"use server";

import { auth } from "@/auth";
import { classifyFreeText, composeTransition, detectRiskDisclosure } from "@/lib/assessment/llm";
import type { ClassificationResult } from "@/lib/assessment/llm";
import type { TransitionContext } from "@/lib/assessment/llm";

export async function getTransitionMessage(
    context: TransitionContext
): Promise<{ success: boolean; text?: string; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    const text = await composeTransition(context);
    return { success: true, text };
}

export async function classifyFreeTextResponse(
    text: string,
    options: string[]
): Promise<{ success: boolean; result?: ClassificationResult; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    if (text.trim().length === 0) return { success: true, result: "UNCLEAR" };

    const result = await classifyFreeText(text, options);
    return { success: true, result };
}

export async function checkRiskDisclosure(
    text: string
): Promise<{ success: boolean; detected?: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "User not authenticated" };

    return { success: true, detected: detectRiskDisclosure(text) };
}
