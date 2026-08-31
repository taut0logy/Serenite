"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * One-to-one support for members whose assessment escalated on risk.
 *
 * Escalation bars peer group placement, so this is where those members go
 * instead. It is a queue any HOST or MANAGER can claim from, not an emergency
 * service: crisis resources are surfaced to the member at answer time,
 * independently of this channel, and nothing here promises a response time.
 */

const RESPONDER_ROLES = ["HOST", "MANAGER", "ADMIN"] as const;

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function requireUser() {
    const session = await auth();
    if (!session?.user?.id) return null;
    return session.user;
}

async function requireResponder() {
    const user = await requireUser();
    if (!user) return null;
    const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true },
    });
    if (!record) return null;
    return RESPONDER_ROLES.includes(record.role as (typeof RESPONDER_ROLES)[number])
        ? record
        : null;
}

export interface SupportConversationSummary {
    id: string;
    status: "OPEN" | "CLAIMED" | "CLOSED";
    openedAt: Date;
    claimedAt: Date | null;
    claimedById: string | null;
    claimedByName: string | null;
    memberName: string;
    memberId: string;
    messageCount: number;
    lastMessageAt: Date | null;
}

export interface SupportMessage {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
}

/**
 * Opens the member's conversation, or returns the existing one.
 *
 * Called from `completeAssessment` when an assessment escalates. Idempotent
 * by design: a member who escalates twice rejoins the thread a responder may
 * already have claimed, rather than starting a second one that nobody is
 * watching. Re-opens a CLOSED thread, since a new escalation is new grounds.
 */
export async function openSupportConversation(
    memberId: string,
    assessmentId?: string
): Promise<Result<{ conversationId: string }>> {
    try {
        const existing = await prisma.supportConversation.findUnique({ where: { memberId } });

        if (existing) {
            if (existing.status === "CLOSED") {
                await prisma.supportConversation.update({
                    where: { id: existing.id },
                    data: { status: "OPEN", claimedById: null, claimedAt: null, closedAt: null, assessmentId },
                });
            }
            return { success: true, data: { conversationId: existing.id } };
        }

        const created = await prisma.supportConversation.create({
            data: { memberId, assessmentId },
        });
        return { success: true, data: { conversationId: created.id } };
    } catch (error) {
        console.error("Error opening support conversation:", error);
        return { success: false, error: "Failed to open support conversation" };
    }
}

/** The signed-in member's own conversation, if they have one. */
export async function getMySupportConversation(): Promise<
    Result<{ conversation: SupportConversationSummary | null; messages: SupportMessage[] }>
> {
    try {
        const user = await requireUser();
        if (!user) return { success: false, error: "User not authenticated" };

        const conversation = await prisma.supportConversation.findUnique({
            where: { memberId: user.id },
            include: {
                claimedBy: { select: { profile: { select: { firstName: true } } } },
                member: { select: { profile: { select: { firstName: true } } } },
                messages: { orderBy: { createdAt: "asc" } },
            },
        });

        if (!conversation) return { success: true, data: { conversation: null, messages: [] } };

        return {
            success: true,
            data: {
                conversation: toSummary(conversation),
                messages: conversation.messages.map(toMessage),
            },
        };
    } catch (error) {
        console.error("Error loading support conversation:", error);
        return { success: false, error: "Failed to load conversation" };
    }
}

/** The responder queue. Open threads first, oldest first: nobody waits longest twice. */
export async function listSupportConversations(): Promise<Result<SupportConversationSummary[]>> {
    try {
        const responder = await requireResponder();
        if (!responder) return { success: false, error: "Not authorised" };

        const conversations = await prisma.supportConversation.findMany({
            where: { status: { in: ["OPEN", "CLAIMED"] } },
            include: {
                claimedBy: { select: { profile: { select: { firstName: true } } } },
                member: { select: { profile: { select: { firstName: true } } } },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
                _count: { select: { messages: true } },
            },
            orderBy: [{ status: "asc" }, { openedAt: "asc" }],
        });

        return { success: true, data: conversations.map(toSummary) };
    } catch (error) {
        console.error("Error listing support conversations:", error);
        return { success: false, error: "Failed to list conversations" };
    }
}

/**
 * The messages on one conversation, for a responder working the queue.
 * Readable by any responder so a thread can be assessed before it is claimed;
 * replying still requires holding it.
 */
export async function getSupportConversationMessages(
    conversationId: string
): Promise<Result<SupportMessage[]>> {
    try {
        const responder = await requireResponder();
        if (!responder) return { success: false, error: "Not authorised" };

        const messages = await prisma.message.findMany({
            where: { supportConversationId: conversationId },
            orderBy: { createdAt: "asc" },
        });
        return { success: true, data: messages.map(toMessage) };
    } catch (error) {
        console.error("Error loading support messages:", error);
        return { success: false, error: "Failed to load messages" };
    }
}

/**
 * Claims an open conversation. Guarded by a conditional update rather than a
 * read-then-write, so two responders opening the queue at the same moment
 * cannot both believe they own the thread.
 */
export async function claimSupportConversation(conversationId: string): Promise<Result<null>> {
    try {
        const responder = await requireResponder();
        if (!responder) return { success: false, error: "Not authorised" };

        const claimed = await prisma.supportConversation.updateMany({
            where: { id: conversationId, status: "OPEN" },
            data: { status: "CLAIMED", claimedById: responder.id, claimedAt: new Date() },
        });

        if (claimed.count === 0) {
            return { success: false, error: "Someone else already picked this up" };
        }

        revalidatePath("/support");
        return { success: true, data: null };
    } catch (error) {
        console.error("Error claiming support conversation:", error);
        return { success: false, error: "Failed to claim conversation" };
    }
}

/** Closes a claimed conversation. Only the responder holding it may close it. */
export async function closeSupportConversation(conversationId: string): Promise<Result<null>> {
    try {
        const responder = await requireResponder();
        if (!responder) return { success: false, error: "Not authorised" };

        const closed = await prisma.supportConversation.updateMany({
            where: { id: conversationId, claimedById: responder.id, status: "CLAIMED" },
            data: { status: "CLOSED", closedAt: new Date() },
        });

        if (closed.count === 0) {
            return { success: false, error: "You do not hold this conversation" };
        }

        revalidatePath("/support");
        return { success: true, data: null };
    } catch (error) {
        console.error("Error closing support conversation:", error);
        return { success: false, error: "Failed to close conversation" };
    }
}

/**
 * Posts a message. Writable by the member it belongs to, and by the responder
 * who claimed it. An unclaimed thread still accepts the member's messages, so
 * nobody is silenced while waiting for someone to pick it up.
 */
export async function sendSupportMessage(
    conversationId: string,
    content: string
): Promise<Result<SupportMessage>> {
    try {
        const user = await requireUser();
        if (!user) return { success: false, error: "User not authenticated" };

        const trimmed = content.trim();
        if (trimmed.length === 0) return { success: false, error: "Message is empty" };

        const conversation = await prisma.supportConversation.findUnique({
            where: { id: conversationId },
            select: { id: true, memberId: true, claimedById: true },
        });
        if (!conversation) return { success: false, error: "Conversation not found" };

        const isMember = conversation.memberId === user.id;
        const isHolder = conversation.claimedById === user.id;
        if (!isMember && !isHolder) return { success: false, error: "Not authorised" };

        const message = await prisma.message.create({
            data: {
                senderId: user.id,
                supportConversationId: conversationId,
                receiverId: isMember ? conversation.claimedById : conversation.memberId,
                content: trimmed,
            },
        });

        revalidatePath("/support");
        return { success: true, data: toMessage(message) };
    } catch (error) {
        console.error("Error sending support message:", error);
        return { success: false, error: "Failed to send message" };
    }
}

type NamedUser = { profile: { firstName: string } | null } | null;

type ConversationRow = {
    id: string;
    status: string;
    openedAt: Date;
    claimedAt: Date | null;
    claimedById: string | null;
    memberId: string;
    claimedBy: NamedUser;
    member: NamedUser;
    messages: { createdAt: Date }[];
    _count?: { messages: number };
};

function toSummary(row: ConversationRow): SupportConversationSummary {
    return {
        id: row.id,
        status: row.status as SupportConversationSummary["status"],
        openedAt: row.openedAt,
        claimedAt: row.claimedAt,
        claimedById: row.claimedById,
        claimedByName: row.claimedBy?.profile?.firstName ?? null,
        memberName: row.member?.profile?.firstName ?? "Member",
        memberId: row.memberId,
        messageCount: row._count?.messages ?? row.messages.length,
        lastMessageAt: row.messages[0]?.createdAt ?? null,
    };
}

function toMessage(row: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
}): SupportMessage {
    return { id: row.id, content: row.content, senderId: row.senderId, createdAt: row.createdAt };
}
