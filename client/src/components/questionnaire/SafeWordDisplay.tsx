'use client';

/**
 * SafeWordDisplay — Recovery phrase display component
 *
 * Shown once during account setup (after setting a password).
 * The user must confirm they've saved the phrase before proceeding.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

interface SafeWordDisplayProps {
    words: string[];
    onConfirmed: () => void;
    /** If true, renders as a full-page dialog (for first-time setup) */
    asDialog?: boolean;
}

export default function SafeWordDisplay({ words, onConfirmed, asDialog = true }: SafeWordDisplayProps) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [checked, setChecked] = useState(false);

    const phrase = words.join(' ');

    const handleCopy = async () => {
        await navigator.clipboard.writeText(phrase);
        setCopied(true);
        toast.success('Safe phrase copied to clipboard');
        setTimeout(() => setCopied(false), 3000);
    };

    const content = (
        <div className="space-y-6">
            {/* Warning Banner */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        Save your Safe Phrase — it cannot be recovered
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                        Your mental health data is encrypted with a key that only you can access.
                        If you forget your password, these 12 words are the only way to recover your data.
                        Write them down and store them somewhere safe. We will never show them again.
                    </p>
                </div>
            </div>

            {/* Word Grid */}
            <div className="relative">
                <div
                    className={`grid grid-cols-3 gap-2 transition-all duration-200 ${!revealed ? 'blur-md select-none pointer-events-none' : ''
                        }`}
                >
                    {words.map((word, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2"
                        >
                            <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">
                                {i + 1}.
                            </span>
                            <span className="font-mono text-sm font-medium tracking-wide">{word}</span>
                        </div>
                    ))}
                </div>

                {/* Reveal overlay */}
                {!revealed && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setRevealed(true)}
                            className="gap-2 shadow-lg"
                        >
                            <Eye className="h-4 w-4" />
                            Reveal Safe Phrase
                        </Button>
                    </div>
                )}
            </div>

            {/* Actions */}
            {revealed && (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="gap-2 flex-1"
                    >
                        {copied ? (
                            <><CheckCircle2 className="h-4 w-4 text-green-500" /> Copied</>
                        ) : (
                            <><Copy className="h-4 w-4" /> Copy phrase</>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevealed(false)}
                        className="gap-2"
                    >
                        <EyeOff className="h-4 w-4" />
                        Hide
                    </Button>
                </div>
            )}

            {/* Confirmation Checkbox */}
            <label className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/20'
                }`}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm leading-relaxed">
                    I have written down or saved my safe phrase in a secure place.
                    I understand I cannot recover my data without it if I forget my password.
                </span>
            </label>

            <Button
                className="w-full"
                disabled={!checked || !revealed}
                onClick={onConfirmed}
            >
                Continue to Dashboard
            </Button>
        </div>
    );

    if (!asDialog) return content;

    return (
        <Dialog open>
            <DialogContent
                className="max-w-lg"
                onPointerDownOutside={(e) => e.preventDefault()}  // Prevent accidental dismiss
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Your Safe Phrase
                    </DialogTitle>
                    <DialogDescription>
                        This phrase is the backup key to your encrypted health data.
                    </DialogDescription>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}
