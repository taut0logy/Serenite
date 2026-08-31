// Server-only. Imports the OpenAI SDK, so nothing in a client component may
// import this module. The risk detector deliberately lives in
// risk-patterns.ts instead, where the browser can run it directly.
//
// The model has exactly one job here: map a free-text answer onto one of the
// item's own option indices. It never sees theta, a severity band, or a
// profile, and it never supplies item text. An answer it cannot map returns
// UNCLEAR and the item is asked again, verbatim.

import OpenAI from "openai";

// Any OpenAI-compatible provider works here: set OPENAI_BASE_URL and
// OPENAI_API_KEY. Defaults to OpenRouter with a low-cost model, since this
// module only ever needs closed-set classification.
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
