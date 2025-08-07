import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReflectionPromptsProps {
    prompts?: string[];
    onSelectPrompt: (prompt: string) => void;
}

// Default prompts to show when no API prompts are available
const defaultPrompts = [
    "What made you feel accomplished today?",
    "What challenges did you face today?",
    "What are you grateful for today?",
    "How did you take care of yourself today?",
    "What would you like to focus on tomorrow?",
];

export function ReflectionPrompts({
    prompts = [],
    onSelectPrompt,
}: ReflectionPromptsProps) {
    // Use provided prompts or fall back to default ones
    const displayPrompts = prompts.length > 0 ? prompts : defaultPrompts;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reflection Prompts</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {displayPrompts.map((prompt, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            className="w-full text-left justify-start"
                            onClick={() => onSelectPrompt(prompt)}
                        >
                            {prompt}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
