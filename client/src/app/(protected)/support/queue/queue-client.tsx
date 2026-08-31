"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportThread } from "@/components/support/support-thread";
import {
    claimSupportConversation,
    closeSupportConversation,
    getSupportConversationMessages,
    type SupportConversationSummary,
    type SupportMessage,
} from "@/actions/support-conversation.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface QueueClientProps {
    conversations: SupportConversationSummary[];
    currentUserId: string;
}

function waitingFor(openedAt: Date): string {
    const hours = Math.floor((Date.now() - new Date(openedAt).getTime()) / 3_600_000);
    if (hours < 1) return "under an hour";
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
}

export function QueueClient({ conversations, currentUserId }: QueueClientProps) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    // Fetched when a thread is opened rather than for the whole queue, so
    // reading one conversation does not pull everyone else's messages.
    const [messages, setMessages] = useState<Record<string, SupportMessage[]>>({});

    const toggleOpen = async (conversationId: string) => {
        if (openId === conversationId) {
            setOpenId(null);
            return;
        }
        setOpenId(conversationId);
        if (messages[conversationId]) return;

        const result = await getSupportConversationMessages(conversationId);
        if (result.success) {
            setMessages((prev) => ({ ...prev, [conversationId]: result.data }));
        } else {
            toast.error(result.error);
        }
    };

    const act = async (id: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
        setBusy(id);
        const result = await fn();
        setBusy(null);
        if (result.success) {
            router.refresh();
        } else {
            // Most often: another responder claimed it a moment earlier.
            toast.error(result.error ?? "That did not work");
            router.refresh();
        }
    };

    if (conversations.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                Nothing waiting. Conversations appear here when a member&apos;s check-in
                escalates.
            </p>
        );
    }

    return (
        <ul className="space-y-4">
            {conversations.map((conversation) => {
                // Held by *me*, not merely held. The server enforces this too;
                // the UI should not offer an action it knows will be refused.
                const mine =
                    conversation.status === "CLAIMED" && conversation.claimedById === currentUserId;
                const expanded = openId === conversation.id;

                return (
                    <li key={conversation.id}>
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base">{conversation.memberName}</CardTitle>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Waiting {waitingFor(conversation.openedAt)} ·{" "}
                                        {conversation.messageCount} message
                                        {conversation.messageCount === 1 ? "" : "s"}
                                    </p>
                                </div>
                                <Badge variant={conversation.status === "OPEN" ? "destructive" : "secondary"}>
                                    {conversation.status === "OPEN"
                                        ? "Unclaimed"
                                        : `Held by ${conversation.claimedByName ?? "someone"}`}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {conversation.status === "OPEN" && (
                                        <Button
                                            size="sm"
                                            disabled={busy === conversation.id}
                                            onClick={() =>
                                                act(conversation.id, () =>
                                                    claimSupportConversation(conversation.id)
                                                )
                                            }
                                        >
                                            Pick this up
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void toggleOpen(conversation.id)}
                                    >
                                        {expanded ? "Hide conversation" : "Open conversation"}
                                    </Button>
                                    {mine && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={busy === conversation.id}
                                            onClick={() =>
                                                act(conversation.id, () =>
                                                    closeSupportConversation(conversation.id)
                                                )
                                            }
                                        >
                                            Close
                                        </Button>
                                    )}
                                </div>

                                {expanded && (
                                    <SupportThread
                                        conversationId={conversation.id}
                                        currentUserId={currentUserId}
                                        initialMessages={messages[conversation.id] ?? []}
                                        // Reading another responder's thread is fine;
                                        // replying to it is not, or two people answer
                                        // the same person at once.
                                        readOnly={!mine}
                                        emptyHint="No messages yet."
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </li>
                );
            })}
        </ul>
    );
}
