/**
 * Demo component showing how to use encrypted group chat
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEncryptedGroupChat } from "@/hooks/use-encrypted-group-chat";
import { EncryptedGroupChatPanel } from "@/components/meeting/encrypted-group-chat-panel";
import {
    keyManagementService,
    type GroupMember,
} from "@/services/key-management.service";
import { MessageSquare, Users, Lock } from "lucide-react";

export const EncryptedChatDemo = () => {
    const { data: session } = useSession();
    const [meetingId, setMeetingId] = useState("demo-meeting-123");
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    const [newMemberUserId, setNewMemberUserId] = useState("");

    const {
        messages,
        sendMessage,
        clearMessages,
        isConnected,
        isEncryptionReady,
        encryptionError,
        addGroupMember,
        removeGroupMember,
        retryEncryption,
    } = useEncryptedGroupChat({
        meetingId,
        groupMembers,
    });

    // Initialize demo group with current user
    useEffect(() => {
        const initializeDemoGroup = async () => {
            try {
                if (!session?.user?.id) return;

                // Get current user's public key
                await keyManagementService.initialize(session.user.id);
                const publicKey = await keyManagementService.getUserPublicKey();

                const currentUserMember: GroupMember = {
                    userId: session.user.id,
                    publicKey,
                    joinedAt: new Date().toISOString(),
                };

                setGroupMembers([currentUserMember]);
            } catch (error) {
                console.error("Failed to initialize demo group:", error);
            }
        };

        if (session?.user?.id) {
            initializeDemoGroup();
        }
    }, [session?.user?.id]);

    const handleAddMember = async () => {
        if (!newMemberUserId.trim()) return;

        try {
            // In a real app, you'd fetch the user's public key from the server
            // For demo purposes, we'll generate a mock key
            const mockPublicKey = "mock-public-key-" + newMemberUserId;

            const newMember: GroupMember = {
                userId: newMemberUserId,
                publicKey: mockPublicKey,
                joinedAt: new Date().toISOString(),
            };

            await addGroupMember(newMember);
            setGroupMembers((prev) => [...prev, newMember]);
            setNewMemberUserId("");
        } catch (error) {
            console.error("Failed to add member:", error);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            await removeGroupMember(userId);
            setGroupMembers((prev) => prev.filter((m) => m.userId !== userId));
        } catch (error) {
            console.error("Failed to remove member:", error);
        }
    };

    if (!session) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Encrypted Chat Demo
                    </CardTitle>
                    <CardDescription>
                        Please sign in to test the encrypted group chat
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-green-500" />
                            End-to-End Encrypted Group Chat Demo
                        </CardTitle>
                        <CardDescription>
                            Testing E2E encryption with ECDH key exchange and
                            AES-GCM message encryption
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Meeting ID */}
                        <div className="space-y-2">
                            <Label htmlFor="meetingId">Meeting ID</Label>
                            <Input
                                id="meetingId"
                                value={meetingId}
                                onChange={(e) => setMeetingId(e.target.value)}
                                placeholder="Enter meeting ID"
                            />
                        </div>

                        {/* Status Indicators */}
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${
                                        isConnected
                                            ? "bg-green-500"
                                            : "bg-red-500"
                                    }`}
                                />
                                <span>
                                    Socket:{" "}
                                    {isConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full ${
                                        isEncryptionReady
                                            ? "bg-green-500"
                                            : "bg-yellow-500"
                                    }`}
                                />
                                <span>
                                    Encryption:{" "}
                                    {isEncryptionReady
                                        ? "Ready"
                                        : "Setting up..."}
                                </span>
                            </div>
                            {encryptionError && (
                                <div className="flex items-center gap-2 text-red-600">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span>Error: {encryptionError}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Group Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Group Members ({groupMembers.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Current Members */}
                        <div className="space-y-2">
                            {groupMembers.map((member) => (
                                <div
                                    key={member.userId}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                >
                                    <div>
                                        <span className="font-medium">
                                            {member.userId}
                                        </span>
                                        {member.userId === session.user.id && (
                                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    {member.userId !== session.user.id && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleRemoveMember(
                                                    member.userId
                                                )
                                            }
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Member */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="User ID to add"
                                value={newMemberUserId}
                                onChange={(e) =>
                                    setNewMemberUserId(e.target.value)
                                }
                            />
                            <Button
                                onClick={handleAddMember}
                                disabled={!newMemberUserId.trim()}
                            >
                                Add Member
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Chat Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Chat Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                variant={isChatOpen ? "default" : "outline"}
                            >
                                {isChatOpen ? "Close Chat" : "Open Chat"}
                            </Button>
                            <Button onClick={clearMessages} variant="outline">
                                Clear Messages
                            </Button>
                            {encryptionError && (
                                <Button
                                    onClick={retryEncryption}
                                    variant="outline"
                                >
                                    Retry Encryption
                                </Button>
                            )}
                        </div>

                        <div className="text-sm text-gray-600">
                            <p>
                                • Messages are encrypted end-to-end using
                                AES-GCM
                            </p>
                            <p>• Group keys are exchanged using ECDH</p>
                            <p>
                                • Adding/removing members triggers key rotation
                            </p>
                            <p>• Only group members can decrypt messages</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chat Panel */}
            <div className="fixed right-0 top-0 h-full">
                <EncryptedGroupChatPanel
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    messages={messages}
                    onSendMessage={sendMessage}
                    participantCount={groupMembers.length}
                    isConnected={isConnected}
                    isEncryptionReady={isEncryptionReady}
                    encryptionError={encryptionError}
                    onRetryEncryption={retryEncryption}
                />
            </div>
        </div>
    );
};
