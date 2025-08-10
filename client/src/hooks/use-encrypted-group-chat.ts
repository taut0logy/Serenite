/**
 * Encrypted Group Chat Hook
 * Extends the existing useGroupChat hook with end-to-end encryption
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/providers/socket-provider";
import { ChatMessage } from "@/components/meeting/chat-message";
import { keyManagementService, KeyManagementService, type GroupMember } from "@/services/key-management.service";
import { encryptMessage, decryptMessage, type EncryptedMessage } from "@/lib/crypto";

interface UseEncryptedGroupChatProps {
    meetingId: string;
    maxMessages?: number;
    groupMembers?: GroupMember[]; // Public keys of group members
}

interface EncryptedChatMessagePayload {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    encryptedContent: EncryptedMessage;
    timestamp: string;
    meetingId: string;
    keyVersion: number;
}

interface DecryptedChatMessage extends ChatMessage {
    isDecrypted: boolean;
    decryptionError?: string;
}

export const useEncryptedGroupChat = ({
    meetingId,
    maxMessages = 100,
    groupMembers = []
}: UseEncryptedGroupChatProps) => {
    const { data: session } = useSession();
    const socket = useSocket();
    const [messages, setMessages] = useState<DecryptedChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isEncryptionReady, setIsEncryptionReady] = useState(false);
    const [encryptionError, setEncryptionError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const messagesRef = useRef<DecryptedChatMessage[]>([]);
    const keyManagerRef = useRef<KeyManagementService | null>(null);

    // Initialize encryption when component mounts
    useEffect(() => {
        const initializeEncryption = async () => {
            if (isInitializing) {
                console.log('🔄 Encryption initialization already in progress, skipping...');
                return;
            }

            try {
                setIsInitializing(true);
                setEncryptionError(null);
                console.log('🔐 Starting encryption initialization for meeting:', meetingId);

                if (!session?.user?.id) {
                    console.error('❌ No user session available');
                    setEncryptionError('User session not available');
                    return;
                }

                // Initialize key management service
                console.log('🔑 Initializing key management service...');
                if (!keyManagerRef.current) {
                    keyManagerRef.current = keyManagementService;
                }
                await keyManagerRef.current.initialize(session.user.id);
                console.log('✅ Key management service initialized');

                // Check if we have a group key for this meeting
                let groupKey = keyManagementService.getGroupKey(meetingId);
                console.log('🔍 Checking for existing group key:', groupKey ? 'Found' : 'Not found');

                if (!groupKey && groupMembers.length > 0) {
                    // Create group if we're the first to join
                    console.log('🆕 Creating new encrypted group for meeting:', meetingId);
                    console.log('👥 Group members:', groupMembers.map(m => ({ userId: m.userId, hasPublicKey: !!m.publicKey })));

                    try {
                        await keyManagementService.createGroup(meetingId, groupMembers);
                        console.log('✅ Group created successfully');
                        groupKey = keyManagementService.getGroupKey(meetingId);
                        console.log('🔑 Group key retrieved:', groupKey ? 'Success' : 'Failed');
                    } catch (createError) {
                        console.error('❌ Group creation failed:', createError);
                        throw createError;
                    }
                } else if (!groupKey) {
                    // Try to fetch group key from server
                    console.log('🌐 Fetching group key from server for meeting:', meetingId);
                    const groupKeyBundle = await keyManagementService.fetchGroupKey(meetingId, session.user.id);

                    if (groupKeyBundle) {
                        console.log('📦 Group key bundle found:', groupKeyBundle);
                        // We need to get the creator's public key to decrypt
                        // For now, assume we'll get it from the server
                        console.warn('⚠️ Group key found but decryption not implemented yet');
                    } else {
                        console.log('❌ No group key bundle found on server');
                    }
                }

                if (groupKey) {
                    setIsEncryptionReady(true);
                    console.log('🎉 Encryption ready for meeting:', meetingId);
                } else {
                    // No existing group key found, create a new encryption group
                    console.log('🆕 No encryption group found, creating new group for meeting:', meetingId);

                    if (groupMembers && groupMembers.length > 0) {
                        console.log('👥 Creating encryption group with members:', groupMembers.map(m => m.userId));

                        try {
                            await keyManagerRef.current!.createGroup(meetingId, groupMembers);
                            // Check if the group was created successfully by looking for the local key
                            const createdKey = keyManagerRef.current!.getGroupKey(meetingId);
                            if (createdKey) {
                                setIsEncryptionReady(true);
                                console.log('🎉 New encryption group created successfully!');
                            } else {
                                const errorMsg = 'Failed to create encryption group - no key found';
                                console.error('❌', errorMsg);
                                setEncryptionError(errorMsg);
                            }
                        } catch (createError) {
                            const errorMsg = `Failed to create encryption group: ${createError instanceof Error ? createError.message : 'Unknown error'}`;
                            console.error('❌', errorMsg);
                            setEncryptionError(errorMsg);
                        }
                    } else {
                        const errorMsg = 'Cannot create encryption group: no group members provided';
                        console.error('❌', errorMsg);
                        setEncryptionError(errorMsg);
                    }
                }

            } catch (error) {
                console.error('💥 Failed to initialize encryption:', error);
                setEncryptionError(`Failed to initialize encryption: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsInitializing(false);
            }
        };

        if (session?.user?.id) {
            initializeEncryption();
        }
    }, [session?.user?.id, meetingId, groupMembers, isInitializing]);

    // Update ref when messages change
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Track connection status and set up chat handlers
    useEffect(() => {
        if (!socket) {
            setIsConnected(false);
            return;
        }

        const handleConnect = () => {
            setIsConnected(true);
            // Join the meeting room for encrypted chat
            socket.emit("join-meeting-chat", { meetingId });
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        const handleEncryptedChatMessage = async (payload: EncryptedChatMessagePayload) => {
            // Only process messages for this meeting
            if (payload.meetingId !== meetingId) return;

            try {
                let decryptedContent = '';
                let isDecrypted = false;
                let decryptionError: string | undefined;

                // Try to decrypt the message
                const groupKey = keyManagementService.getGroupKey(meetingId);
                if (groupKey && isEncryptionReady) {
                    try {
                        decryptedContent = await decryptMessage(payload.encryptedContent, groupKey);
                        isDecrypted = true;
                    } catch (error) {
                        console.error('Failed to decrypt message:', error);
                        decryptedContent = '[Encrypted message - decryption failed]';
                        decryptionError = 'Failed to decrypt message';
                    }
                } else {
                    decryptedContent = '[Encrypted message - key not available]';
                    decryptionError = 'Encryption key not available';
                }

                const newMessage: DecryptedChatMessage = {
                    id: payload.id,
                    userId: payload.userId,
                    userName: payload.userName,
                    userAvatar: payload.userAvatar,
                    content: decryptedContent,
                    timestamp: new Date(payload.timestamp),
                    isCurrentUser: payload.userId === session?.user?.id,
                    isDecrypted,
                    decryptionError,
                };

                setMessages(prev => {
                    const updated = [...prev, newMessage];
                    return updated.slice(-maxMessages);
                });

            } catch (error) {
                console.error('Error handling encrypted message:', error);
            }
        };

        const handleUserJoined = (data: { userId: string; userName: string }) => {
            const systemMessage: DecryptedChatMessage = {
                id: `system-${Date.now()}-${data.userId}`,
                userId: "system",
                userName: "System",
                content: `${data.userName} joined the meeting`,
                timestamp: new Date(),
                isCurrentUser: false,
                isDecrypted: true,
            };

            setMessages(prev => [...prev, systemMessage].slice(-maxMessages));
        };

        const handleUserLeft = (data: { userId: string; userName: string }) => {
            const systemMessage: DecryptedChatMessage = {
                id: `system-${Date.now()}-${data.userId}`,
                userId: "system",
                userName: "System",
                content: `${data.userName} left the meeting`,
                timestamp: new Date(),
                isCurrentUser: false,
                isDecrypted: true,
            };

            setMessages(prev => [...prev, systemMessage].slice(-maxMessages));
        };

        // Set up event listeners
        if (socket.connected) {
            handleConnect();
        }

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("encrypted-chat-message", handleEncryptedChatMessage);
        socket.on("user-joined-meeting", handleUserJoined);
        socket.on("user-left-meeting", handleUserLeft);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("encrypted-chat-message", handleEncryptedChatMessage);
            socket.off("user-joined-meeting", handleUserJoined);
            socket.off("user-left-meeting", handleUserLeft);

            // Leave the meeting room
            if (socket.connected) {
                socket.emit("leave-meeting-chat", { meetingId });
            }
        };
    }, [socket, meetingId, session?.user?.id, maxMessages, isEncryptionReady]);

    const sendEncryptedMessage = useCallback(async (content: string) => {
        if (!socket || !socket.connected || !session?.user) {
            console.warn("Cannot send message: Socket not connected or user not authenticated");
            return;
        }

        if (!isEncryptionReady) {
            console.warn("Cannot send message: Encryption not ready");
            return;
        }

        try {
            const groupKey = keyManagementService.getGroupKey(meetingId);
            if (!groupKey) {
                throw new Error('Group encryption key not available');
            }

            // Encrypt the message
            const encryptedContent = await encryptMessage(content, groupKey);

            const messagePayload: Omit<EncryptedChatMessagePayload, "id" | "timestamp"> = {
                userId: session.user.id,
                userName: session.user.firstName || "Unknown User",
                userAvatar: session.user.image || undefined,
                encryptedContent,
                meetingId,
                keyVersion: 1, // TODO: Get actual key version
            };

            // Emit the encrypted message to the server
            socket.emit("send-encrypted-chat-message", messagePayload);

        } catch (error) {
            console.error('Failed to send encrypted message:', error);
            setEncryptionError('Failed to send encrypted message');
        }
    }, [socket, session?.user, meetingId, isEncryptionReady]);

    const addGroupMember = useCallback(async (newMember: GroupMember) => {
        try {
            const currentMembers = [...groupMembers, newMember];
            await keyManagementService.rotateGroupKey(meetingId, currentMembers);

            // Notify server about key rotation
            if (socket && socket.connected) {
                socket.emit("group-key-rotated", {
                    meetingId,
                    newMemberId: newMember.userId
                });
            }

        } catch (error) {
            console.error('Failed to add group member:', error);
            setEncryptionError('Failed to add group member');
        }
    }, [meetingId, groupMembers, socket]);

    const removeGroupMember = useCallback(async (removedUserId: string) => {
        try {
            const currentMembers = groupMembers.filter(m => m.userId !== removedUserId);
            await keyManagementService.rotateGroupKey(meetingId, currentMembers);

            // Notify server about key rotation
            if (socket && socket.connected) {
                socket.emit("group-key-rotated", {
                    meetingId,
                    removedMemberId: removedUserId
                });
            }

        } catch (error) {
            console.error('Failed to remove group member:', error);
            setEncryptionError('Failed to remove group member');
        }
    }, [meetingId, groupMembers, socket]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const retryEncryption = useCallback(async () => {
        if (session?.user?.id) {
            try {
                setEncryptionError(null);

                // Initialize key management service
                await keyManagementService.initialize(session.user.id);

                // Check if we have a group key for this meeting
                let groupKey = keyManagementService.getGroupKey(meetingId);

                if (!groupKey && groupMembers.length > 0) {
                    // Create group if we're the first to join
                    console.log('Creating new encrypted group for meeting:', meetingId);
                    await keyManagementService.createGroup(meetingId, groupMembers);
                    groupKey = keyManagementService.getGroupKey(meetingId);
                } else if (!groupKey) {
                    // Try to fetch group key from server
                    console.log('Fetching group key for meeting:', meetingId);
                    const groupKeyBundle = await keyManagementService.fetchGroupKey(meetingId, session.user.id);

                    if (groupKeyBundle) {
                        // We need to get the creator's public key to decrypt
                        // For now, assume we'll get it from the server
                        console.warn('Group key found but decryption not implemented yet');
                    }
                }

                if (groupKey) {
                    setIsEncryptionReady(true);
                    console.log('Encryption ready for meeting:', meetingId);
                } else {
                    setEncryptionError('Unable to establish encryption for this group');
                }

            } catch (error) {
                console.error('Failed to initialize encryption:', error);
                setEncryptionError('Failed to initialize encryption');
            }
        }
    }, [session?.user?.id, meetingId, groupMembers]);

    return {
        messages,
        sendMessage: sendEncryptedMessage,
        clearMessages,
        isConnected,
        isEncryptionReady,
        encryptionError,
        addGroupMember,
        removeGroupMember,
        retryEncryption,
    };
};
