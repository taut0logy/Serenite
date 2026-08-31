import OpenAI from "openai";
import type { DomainKey } from "./types";

// Any OpenAI-compatible provider works here: set OPENAI_BASE_URL and
// OPENAI_API_KEY. Defaults to OpenRouter with a low-cost model, since this
// module only ever needs short transition text and closed-set classification.
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "ibm-granite/granite-4.0-h-micro";

let client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!client) {
        client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
        });
    }
    return client;
}

function getModel(): string {
    return process.env.ASSESSMENT_LLM_MODEL || DEFAULT_MODEL;
}

export type ClassificationResult = number | "UNCLEAR";

// Pulls the first integer out of the model's reply and checks it against the
// item's real option count. This is the actual safety boundary, not the
// model's own judgment - a malformed or out-of-range reply always maps to
// UNCLEAR rather than a guessed score.
export function parseClassification(raw: string, optionCount: number): ClassificationResult {
    const match = raw.match(/-?\d+/);
    if (!match) return "UNCLEAR";
    const n = parseInt(match[0], 10);
    if (!Number.isInteger(n) || n < 0 || n >= optionCount) return "UNCLEAR";
    return n;
}

const RISK_PATTERNS: RegExp[] = [
    /\bkill(ing)? myself\b/i,
    /\bend(ing)? my life\b/i,
    /\bwant(ed)? to die\b/i,
    /\bbetter off dead\b/i,
    /\bsuicid(e|al)\b/i,
    /\b(cutting|hurting) myself\b/i,
    /\bself[- ]harm\b/i,
    /\bdon'?t want to (live|be here) (anymore|any more)\b/i,
];

export function detectRiskDisclosure(text: string): boolean {
    return RISK_PATTERNS.some((pattern) => pattern.test(text));
}

const CLASSIFY_SYSTEM_PROMPT =
    "You map a free-text answer to one option index. Reply with only the " +
    "index number, or the word UNCLEAR if the answer does not clearly match " +
    "any option. No other text.";

export async function classifyFreeText(
    text: string,
    options: string[]
): Promise<ClassificationResult> {
    const optionList = options.map((label, i) => `${i}: ${label}`).join("\n");
    const completion = await getClient().chat.completions.create({
        model: getModel(),
        temperature: 0,
        max_tokens: 8,
        messages: [
            { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
            { role: "user", content: `Options:\n${optionList}\n\nAnswer: "${text}"` },
        ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    return parseClassification(raw, options.length);
}

const TRANSITION_SYSTEM_PROMPT =
    "You write one short, warm sentence transitioning to the next part of a " +
    "mental health check-in. Do not ask a question, do not state any item " +
    "text or score, do not use emoji. One sentence only.";

const FALLBACK_TRANSITION = "Let's continue.";

export interface TransitionContext {
    previousDomain?: DomainKey;
    nextDomain: DomainKey;
    isFirst: boolean;
}

export async function composeTransition(context: TransitionContext): Promise<string> {
    const prompt = context.isFirst
        ? `Starting the ${context.nextDomain} section.`
        : `Moving from ${context.previousDomain} to ${context.nextDomain}.`;

    try {
        const completion = await getClient().chat.completions.create({
            model: getModel(),
            temperature: 0.7,
            max_tokens: 60,
            messages: [
                { role: "system", content: TRANSITION_SYSTEM_PROMPT },
                { role: "user", content: prompt },
            ],
        });
        return completion.choices[0]?.message?.content?.trim() || FALLBACK_TRANSITION;
    } catch {
        return FALLBACK_TRANSITION;
    }
}
