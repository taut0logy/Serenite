"use server";

import prisma from "@/lib/prisma";

export interface ChatMessageData {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    meetingId: string;
    replyToId?: string;
    replyToUserName?: string;
    replyToContent?: string;
    isDeleted: boolean;
    createdAt: Date;
}

/**
 * Get all messages for a meeting
 */
export async function getMeetingMessages(meetingId: string): Promise<{
    success: boolean;
    messages?: ChatMessageData[];
    error?: string;
}> {
    try {
        const messages = await prisma.message.findMany({
            where: { meetingId },
            include: {
                sender: {
                    include: {
                        profile: true,
                    },
                },
                replyTo: {
                    include: {
                        sender: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return {
            success: true,
            messages: messages.map((msg) => ({
                id: msg.id,
                senderId: msg.senderId,
                senderName: msg.sender.profile?.firstName || "Unknown",
                senderAvatar: msg.sender.profile?.avatarUrl || undefined,
                content: msg.isDeleted ? "" : msg.content,
                meetingId: msg.meetingId!,
                replyToId: msg.replyToId || undefined,
                replyToUserName: msg.replyTo?.sender?.profile?.firstName || undefined,
                replyToContent: msg.replyTo?.isDeleted ? "" : msg.replyTo?.content,
                isDeleted: msg.isDeleted,
                createdAt: msg.createdAt,
            })),
        };
    } catch (error) {
        console.error("Error getting meeting messages:", error);
        return { success: false, error: "Failed to get messages" };
    }
}

/**
 * Save a new message to the database
 */
export async function saveMessage(data: {
    senderId: string;
    meetingId: string;
    content: string;
    replyToId?: string;
}): Promise<{
    success: boolean;
    message?: {
        id: string;
        createdAt: Date;
        senderName: string;
        senderAvatar?: string;
        replyToUserName?: string;
        replyToContent?: string;
    };
    error?: string;
}> {
    try {
        const message = await prisma.message.create({
            data: {
                senderId: data.senderId,
                meetingId: data.meetingId,
                content: data.content,
                replyToId: data.replyToId || null,
            },
            include: {
                sender: {
                    include: {
                        profile: true,
                    },
                },
                replyTo: {
                    include: {
                        sender: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            success: true,
            message: {
                id: message.id,
                createdAt: message.createdAt,
                senderName: message.sender.profile?.firstName || "Unknown",
                senderAvatar: message.sender.profile?.avatarUrl || undefined,
                replyToUserName: message.replyTo?.sender?.profile?.firstName || undefined,
                replyToContent: message.replyTo?.isDeleted ? "" : message.replyTo?.content,
            },
        };
    } catch (error) {
        console.error("Error saving message:", error);
        return { success: false, error: "Failed to save message" };
    }
}

/**
 * Soft delete a message (set isDeleted=true and clear content)
 */
export async function deleteMessage(messageId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        // Verify the user owns the message
        const message = await prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            return { success: false, error: "Message not found" };
        }

        if (message.senderId !== userId) {
            return { success: false, error: "Cannot delete other user's message" };
        }

        await prisma.message.update({
            where: { id: messageId },
            data: {
                isDeleted: true,
                content: "[deleted]",
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting message:", error);
        return { success: false, error: "Failed to delete message" };
    }
}

/**
 * Get a single message by ID (for reply preview)
 */
export async function getMessageById(messageId: string): Promise<{
    success: boolean;
    message?: {
        id: string;
        content: string;
        senderName: string;
        isDeleted: boolean;
    };
    error?: string;
}> {
    try {
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: {
                sender: {
                    include: {
                        profile: true,
                    },
                },
            },
        });

        if (!message) {
            return { success: false, error: "Message not found" };
        }

        return {
            success: true,
            message: {
                id: message.id,
                content: message.isDeleted ? "" : message.content,
                senderName: message.sender.profile?.firstName || "Unknown",
                isDeleted: message.isDeleted,
            },
        };
    } catch (error) {
        console.error("Error getting message:", error);
        return { success: false, error: "Failed to get message" };
    }
}
