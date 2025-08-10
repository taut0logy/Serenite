"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/providers/socket-provider";
import { ChatMessage } from "@/components/meeting/chat-message";

interface UseGroupChatProps {
    meetingId: string;
    maxMessages?: number;
}

interface ChatMessagePayload {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: string;
    meetingId: string;
}

export const useGroupChat = ({
    meetingId,
    maxMessages = 100
}: UseGroupChatProps) => {
    const { data: session } = useSession();
    const socket = useSocket();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const messagesRef = useRef<ChatMessage[]>([]);

    // Update ref when messages change
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Track connection status
    useEffect(() => {
        if (!socket) {
            setIsConnected(false);
            return;
        }

        const handleConnect = () => {
            setIsConnected(true);
            // Join the meeting room for chat
            socket.emit("join-meeting-chat", { meetingId });
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        const handleChatMessage = (payload: ChatMessagePayload) => {
            // Only process messages for this meeting
            if (payload.meetingId !== meetingId) return;

            const newMessage: ChatMessage = {
                id: payload.id,
                userId: payload.userId,
                userName: payload.userName,
                userAvatar: payload.userAvatar,
                content: payload.content,
                timestamp: new Date(payload.timestamp),
                isCurrentUser: payload.userId === session?.user?.id,
            };

            setMessages(prev => {
                const updated = [...prev, newMessage];
                // Keep only the last maxMessages
                return updated.slice(-maxMessages);
            });
        };

        const handleUserJoined = (data: { userId: string; userName: string }) => {
            // Optional: Add system message when user joins
            const systemMessage: ChatMessage = {
                id: `system-${Date.now()}-${data.userId}`,
                userId: "system",
                userName: "System",
                content: `${data.userName} joined the meeting`,
                timestamp: new Date(),
                isCurrentUser: false,
            };

            setMessages(prev => [...prev, systemMessage].slice(-maxMessages));
        };

        const handleUserLeft = (data: { userId: string; userName: string }) => {
            // Optional: Add system message when user leaves
            const systemMessage: ChatMessage = {
                id: `system-${Date.now()}-${data.userId}`,
                userId: "system",
                userName: "System",
                content: `${data.userName} left the meeting`,
                timestamp: new Date(),
                isCurrentUser: false,
            };

            setMessages(prev => [...prev, systemMessage].slice(-maxMessages));
        };

        // Set up event listeners
        if (socket.connected) {
            handleConnect();
        }

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("chat-message", handleChatMessage);
        socket.on("user-joined-meeting", handleUserJoined);
        socket.on("user-left-meeting", handleUserLeft);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("chat-message", handleChatMessage);
            socket.off("user-joined-meeting", handleUserJoined);
            socket.off("user-left-meeting", handleUserLeft);

            // Leave the meeting room
            if (socket.connected) {
                socket.emit("leave-meeting-chat", { meetingId });
            }
        };
    }, [socket, meetingId, session?.user?.id, maxMessages]);

    const sendMessage = useCallback((content: string) => {
        if (!socket || !socket.connected || !session?.user) {
            console.warn("Cannot send message: Socket not connected or user not authenticated");
            return;
        }

        const messagePayload: Omit<ChatMessagePayload, "id" | "timestamp"> = {
            userId: session.user.id,
            userName: session.user.firstName || "Unknown User",
            userAvatar: session.user.image || undefined,
            content,
            meetingId,
        };

        // Emit the message to the server
        socket.emit("send-chat-message", messagePayload);
    }, [socket, session?.user, meetingId]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        sendMessage,
        clearMessages,
        isConnected,
    };
};
