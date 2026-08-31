"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendSupportMessage, type SupportMessage } from "@/actions/support-conversation.actions";
import { toast } from "sonner";

interface SupportThreadProps {
    conversationId: string;
    currentUserId: string;
    initialMessages: SupportMessage[];
    /** Disables composing, for a closed thread or an unclaimed one a responder is viewing. */
    readOnly?: boolean;
    emptyHint: string;
}

/**
 * The message list and composer, shared by the member view and the responder
 * view. Which side a message sits on is decided by sender id, so neither
 * caller has to know anything about roles.
 */
export function SupportThread({
    conversationId,
    currentUserId,
    initialMessages,
    readOnly = false,
    emptyHint,
}: SupportThreadProps) {
    const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const send = async () => {
        const content = draft.trim();
        if (content.length === 0 || sending) return;

        setSending(true);
        const result = await sendSupportMessage(conversationId, content);
        setSending(false);

        if (result.success) {
            setMessages((prev) => [...prev, result.data]);
            setDraft("");
        } else {
            // The draft is deliberately kept, so nothing typed is ever lost.
            toast.error(result.error);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="min-h-48 max-h-[28rem] overflow-y-auto rounded-xl border bg-card/40 p-4">
                {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{emptyHint}</p>
                ) : (
                    <ul className="space-y-3">
                        {messages.map((message) => {
                            const mine = message.senderId === currentUserId;
                            return (
                                <li
                                    key={message.id}
                                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                                            mine
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-foreground"
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                        <time className="mt-1 block text-[10px] opacity-60">
                                            {new Date(message.createdAt).toLocaleString()}
                                        </time>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div ref={endRef} />
            </div>

            {!readOnly && (
                <div className="flex items-end gap-2">
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void send();
                            }
                        }}
                        rows={3}
                        placeholder="Write as much or as little as you want"
                        disabled={sending}
                        className="flex-1 resize-none rounded-xl border-2 border-border/50 bg-card/50 p-3 text-sm outline-none focus:border-primary/50 disabled:opacity-50"
                    />
                    <Button
                        size="icon"
                        onClick={send}
                        disabled={draft.trim().length === 0 || sending}
                        className="h-11 w-11 shrink-0"
                        aria-label="Send message"
                    >
                        {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
