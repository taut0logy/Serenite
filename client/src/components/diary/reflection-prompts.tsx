"use client";

interface ReflectionPromptsProps {
    prompts?: string[];
    onSelectPrompt: (prompt: string) => void;
}

const defaultPrompts = [
    "What made you feel accomplished today?",
    "What challenges did you face today?",
    "What are you grateful for today?",
    "How did you take care of yourself today?",
    "What would you like to focus on tomorrow?",
];

/**
 * Somewhere to start on a day when the page is blank.
 *
 * Rendered as wrapping text rather than single-line buttons: the prompts are
 * whole questions, and the old fixed-height buttons clipped them.
 */
export function ReflectionPrompts({ prompts = [], onSelectPrompt }: ReflectionPromptsProps) {
    const displayPrompts = prompts.length > 0 ? prompts : defaultPrompts;

    return (
        <div>
            <h2 className="mb-2 text-sm font-semibold">Not sure where to start?</h2>
            <ul className="space-y-1.5">
                {displayPrompts.map((prompt) => (
                    <li key={prompt}>
                        <button
                            type="button"
                            onClick={() => onSelectPrompt(prompt)}
                            className="w-full rounded-lg border border-transparent bg-muted/40 px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {prompt}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
