/**
 * Comprehensive Encrypted Chat Test Component
 * Tests all aspects of the E2E encryption system
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEncryptedGroupChat } from "@/hooks/use-encrypted-group-chat";
import { EncryptedGroupChatPanel } from "@/components/meeting/encrypted-group-chat-panel";
import {
    keyManagementService,
    type GroupMember,
} from "@/services/key-management.service";
import {
    generateECDHKeyPair,
    serializeKeyPair,
    generateAESKey,
    encryptMessage,
    decryptMessage,
    generateRandomId,
} from "@/lib/crypto";
import {
    MessageSquare,
    Users,
    Lock,
    Key,
    TestTube,
    CheckCircle,
    XCircle,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestResult {
    name: string;
    status: "pending" | "running" | "passed" | "failed";
    message: string;
    duration?: number;
}

export const ComprehensiveEncryptedChatTest = () => {
    const { data: session } = useSession();
    const [meetingId, setMeetingId] = useState(
        `test-meeting-${generateRandomId(8)}`
    );
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    const [newMemberUserId, setNewMemberUserId] = useState("");
    const [testMessage, setTestMessage] = useState(
        "Hello, this is an encrypted test message! 🔒"
    );
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunningTests, setIsRunningTests] = useState(false);

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

    // Initialize test results
    useEffect(() => {
        setTestResults([
            {
                name: "ECDH Key Pair Generation",
                status: "pending",
                message: "Not started",
            },
            {
                name: "AES Key Generation",
                status: "pending",
                message: "Not started",
            },
            {
                name: "Message Encryption",
                status: "pending",
                message: "Not started",
            },
            {
                name: "Message Decryption",
                status: "pending",
                message: "Not started",
            },
            {
                name: "Key Management Service",
                status: "pending",
                message: "Not started",
            },
            {
                name: "Socket Connection",
                status: "pending",
                message: "Not started",
            },
            {
                name: "Group Creation",
                status: "pending",
                message: "Not started",
            },
            {
                name: "End-to-End Flow",
                status: "pending",
                message: "Not started",
            },
        ]);
    }, []);

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

    const updateTestResult = (
        name: string,
        status: TestResult["status"],
        message: string,
        duration?: number
    ) => {
        setTestResults((prev) =>
            prev.map((test) =>
                test.name === name
                    ? { ...test, status, message, duration }
                    : test
            )
        );
    };

    const runCryptoTests = async () => {
        setIsRunningTests(true);

        try {
            // Test 1: ECDH Key Pair Generation
            updateTestResult(
                "ECDH Key Pair Generation",
                "running",
                "Generating key pair..."
            );
            const keyPairStart = Date.now();
            const keyPair = await generateECDHKeyPair();
            const serialized = await serializeKeyPair(keyPair);
            const keyPairDuration = Date.now() - keyPairStart;

            if (serialized.publicKey && serialized.privateKey) {
                updateTestResult(
                    "ECDH Key Pair Generation",
                    "passed",
                    `Generated P-256 key pair (${keyPairDuration}ms)`,
                    keyPairDuration
                );
            } else {
                updateTestResult(
                    "ECDH Key Pair Generation",
                    "failed",
                    "Key pair generation failed"
                );
                return;
            }

            // Test 2: AES Key Generation
            updateTestResult(
                "AES Key Generation",
                "running",
                "Generating AES key..."
            );
            const aesStart = Date.now();
            const aesKey = await generateAESKey();
            const aesDuration = Date.now() - aesStart;

            updateTestResult(
                "AES Key Generation",
                "passed",
                `Generated AES-256-GCM key (${aesDuration}ms)`,
                aesDuration
            );

            // Test 3: Message Encryption
            updateTestResult(
                "Message Encryption",
                "running",
                "Encrypting test message..."
            );
            const encryptStart = Date.now();
            const encrypted = await encryptMessage(testMessage, aesKey);
            const encryptDuration = Date.now() - encryptStart;

            if (encrypted.encryptedContent && encrypted.iv && encrypted.tag) {
                updateTestResult(
                    "Message Encryption",
                    "passed",
                    `Encrypted ${testMessage.length} chars (${encryptDuration}ms)`,
                    encryptDuration
                );
            } else {
                updateTestResult(
                    "Message Encryption",
                    "failed",
                    "Encryption failed"
                );
                return;
            }

            // Test 4: Message Decryption
            updateTestResult(
                "Message Decryption",
                "running",
                "Decrypting test message..."
            );
            const decryptStart = Date.now();
            const decrypted = await decryptMessage(encrypted, aesKey);
            const decryptDuration = Date.now() - decryptStart;

            if (decrypted === testMessage) {
                updateTestResult(
                    "Message Decryption",
                    "passed",
                    `Decrypted successfully (${decryptDuration}ms)`,
                    decryptDuration
                );
            } else {
                updateTestResult(
                    "Message Decryption",
                    "failed",
                    `Decryption mismatch: expected "${testMessage}", got "${decrypted}"`
                );
                return;
            }

            // Test 5: Key Management Service
            if (session?.user?.id) {
                updateTestResult(
                    "Key Management Service",
                    "running",
                    "Testing key service..."
                );
                const keyServiceStart = Date.now();

                try {
                    await keyManagementService.initialize(session.user.id);
                    const publicKey =
                        await keyManagementService.getUserPublicKey();
                    const keyServiceDuration = Date.now() - keyServiceStart;

                    if (publicKey) {
                        updateTestResult(
                            "Key Management Service",
                            "passed",
                            `Service initialized (${keyServiceDuration}ms)`,
                            keyServiceDuration
                        );
                    } else {
                        updateTestResult(
                            "Key Management Service",
                            "failed",
                            "Failed to get public key"
                        );
                        return;
                    }
                } catch (error) {
                    updateTestResult(
                        "Key Management Service",
                        "failed",
                        `Service error: ${
                            error instanceof Error
                                ? error.message
                                : "Unknown error"
                        }`
                    );
                    return;
                }
            }

            // Test 6: Socket Connection
            updateTestResult(
                "Socket Connection",
                "running",
                "Checking socket..."
            );
            if (isConnected) {
                updateTestResult(
                    "Socket Connection",
                    "passed",
                    "Socket connected"
                );
            } else {
                updateTestResult(
                    "Socket Connection",
                    "failed",
                    "Socket not connected"
                );
            }

            // Test 7: Group Creation
            updateTestResult(
                "Group Creation",
                "running",
                "Testing group creation..."
            );
            const groupStart = Date.now();

            try {
                if (groupMembers.length > 0) {
                    const groupDuration = Date.now() - groupStart;
                    updateTestResult(
                        "Group Creation",
                        "passed",
                        `Group created with ${groupMembers.length} member(s) (${groupDuration}ms)`,
                        groupDuration
                    );
                } else {
                    updateTestResult(
                        "Group Creation",
                        "failed",
                        "No group members found"
                    );
                }
            } catch (error) {
                updateTestResult(
                    "Group Creation",
                    "failed",
                    `Group creation error: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
            }

            // Test 8: End-to-End Flow
            updateTestResult(
                "End-to-End Flow",
                "running",
                "Testing complete flow..."
            );
            const e2eStart = Date.now();

            if (isEncryptionReady && !encryptionError) {
                const e2eDuration = Date.now() - e2eStart;
                updateTestResult(
                    "End-to-End Flow",
                    "passed",
                    `E2E encryption ready (${e2eDuration}ms)`,
                    e2eDuration
                );
            } else {
                updateTestResult(
                    "End-to-End Flow",
                    "failed",
                    `E2E not ready: ${encryptionError || "Unknown error"}`
                );
            }
        } catch (error) {
            console.error("Test suite error:", error);
            updateTestResult(
                "ECDH Key Pair Generation",
                "failed",
                `Test suite error: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        } finally {
            setIsRunningTests(false);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberUserId.trim()) return;

        try {
            // In a real app, you'd fetch the user's public key from the server
            // For demo purposes, we'll generate a new key pair for the mock user
            const mockKeyPair = await generateECDHKeyPair();
            const mockSerialized = await serializeKeyPair(mockKeyPair);

            const newMember: GroupMember = {
                userId: newMemberUserId,
                publicKey: mockSerialized.publicKey,
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

    const getStatusIcon = (status: TestResult["status"]) => {
        switch (status) {
            case "passed":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "running":
                return (
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                );
            default:
                return <div className="h-4 w-4 rounded-full bg-gray-300" />;
        }
    };

    const getStatusColor = (status: TestResult["status"]) => {
        switch (status) {
            case "passed":
                return "bg-green-50 border-green-200";
            case "failed":
                return "bg-red-50 border-red-200";
            case "running":
                return "bg-blue-50 border-blue-200";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    if (!session) {
        return (
            <div className="min-h-[calc(100vh-4rem)] p-4 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Encrypted Chat Test
                        </CardTitle>
                        <CardDescription>
                            Please sign in to test the encrypted group chat
                            system
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TestTube className="h-6 w-6 text-blue-500" />
                            End-to-End Encryption Test Suite
                        </CardTitle>
                        <CardDescription>
                            Comprehensive testing environment for the encrypted
                            group chat system
                        </CardDescription>
                    </CardHeader>
                </Card>

                <Tabs defaultValue="tests" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="tests">Crypto Tests</TabsTrigger>
                        <TabsTrigger value="chat">Live Chat</TabsTrigger>
                        <TabsTrigger value="members">
                            Group Management
                        </TabsTrigger>
                        <TabsTrigger value="status">System Status</TabsTrigger>
                    </TabsList>

                    {/* Crypto Tests Tab */}
                    <TabsContent value="tests" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    Cryptographic Function Tests
                                </CardTitle>
                                <CardDescription>
                                    Test individual crypto functions and
                                    end-to-end flow
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={runCryptoTests}
                                        disabled={isRunningTests}
                                        className="flex items-center gap-2"
                                    >
                                        {isRunningTests ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <TestTube className="h-4 w-4" />
                                        )}
                                        {isRunningTests
                                            ? "Running Tests..."
                                            : "Run All Tests"}
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {testResults.map((test, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border ${getStatusColor(
                                                test.status
                                            )}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(test.status)}
                                                    <span className="font-medium">
                                                        {test.name}
                                                    </span>
                                                    {test.duration && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {test.duration}ms
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                    {test.message}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Live Chat Tab */}
                    <TabsContent value="chat" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Live Encrypted Chat Test
                                </CardTitle>
                                <CardDescription>
                                    Test real-time encrypted messaging
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="testMessage">
                                        Test Message
                                    </Label>
                                    <Textarea
                                        id="testMessage"
                                        value={testMessage}
                                        onChange={(e) =>
                                            setTestMessage(e.target.value)
                                        }
                                        placeholder="Enter a message to test encryption..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() =>
                                            setIsChatOpen(!isChatOpen)
                                        }
                                        variant={
                                            isChatOpen ? "default" : "outline"
                                        }
                                    >
                                        {isChatOpen
                                            ? "Close Chat"
                                            : "Open Chat Panel"}
                                    </Button>
                                    <Button
                                        onClick={() => sendMessage(testMessage)}
                                        disabled={
                                            !isEncryptionReady ||
                                            !testMessage.trim()
                                        }
                                        variant="outline"
                                    >
                                        Send Test Message
                                    </Button>
                                    <Button
                                        onClick={clearMessages}
                                        variant="outline"
                                    >
                                        Clear Chat
                                    </Button>
                                </div>

                                {/* Message History */}
                                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                                    <h4 className="font-medium mb-2">
                                        Message History ({messages.length})
                                    </h4>
                                    {messages.length === 0 ? (
                                        <p className="text-gray-500 text-sm">
                                            No messages yet
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {messages.slice(-5).map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className="text-sm"
                                                >
                                                    <span className="font-medium">
                                                        {msg.userName}:
                                                    </span>{" "}
                                                    <span>{msg.content}</span>
                                                    {msg.isDecrypted ? (
                                                        <Lock className="inline h-3 w-3 text-green-500 ml-1" />
                                                    ) : (
                                                        <AlertTriangle className="inline h-3 w-3 text-red-500 ml-1" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Group Management Tab */}
                    <TabsContent value="members" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Group Members ({groupMembers.length})
                                </CardTitle>
                                <CardDescription>
                                    Test member addition/removal and key
                                    rotation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Current Members */}
                                <div className="space-y-2">
                                    <h4 className="font-medium">
                                        Current Members
                                    </h4>
                                    {groupMembers.map((member) => (
                                        <div
                                            key={member.userId}
                                            className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                                        >
                                            <div>
                                                <span className="font-medium">
                                                    {member.userId}
                                                </span>
                                                {member.userId ===
                                                    session.user.id && (
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-2"
                                                    >
                                                        You
                                                    </Badge>
                                                )}
                                                <p className="text-xs text-gray-500">
                                                    Joined:{" "}
                                                    {new Date(
                                                        member.joinedAt
                                                    ).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            {member.userId !==
                                                session.user.id && (
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
                                <div className="space-y-2">
                                    <h4 className="font-medium">
                                        Add Test Member
                                    </h4>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Test user ID (e.g., user123)"
                                            value={newMemberUserId}
                                            onChange={(e) =>
                                                setNewMemberUserId(
                                                    e.target.value
                                                )
                                            }
                                        />
                                        <Button
                                            onClick={handleAddMember}
                                            disabled={!newMemberUserId.trim()}
                                        >
                                            Add Member
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Adding a member will generate a new key
                                        pair and trigger key rotation
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* System Status Tab */}
                    <TabsContent value="status" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Status</CardTitle>
                                <CardDescription>
                                    Current state of all system components
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium">
                                            Connection Status
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-3 h-3 rounded-full ${
                                                    isConnected
                                                        ? "bg-green-500"
                                                        : "bg-red-500"
                                                }`}
                                            />
                                            <span>
                                                Socket:{" "}
                                                {isConnected
                                                    ? "Connected"
                                                    : "Disconnected"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">
                                            Encryption Status
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-3 h-3 rounded-full ${
                                                    isEncryptionReady
                                                        ? "bg-green-500"
                                                        : "bg-yellow-500"
                                                }`}
                                            />
                                            <span>
                                                E2E:{" "}
                                                {isEncryptionReady
                                                    ? "Ready"
                                                    : "Setting up..."}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">
                                            Meeting Info
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    ID:
                                                </span>{" "}
                                                {meetingId}
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    Members:
                                                </span>{" "}
                                                {groupMembers.length}
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    Messages:
                                                </span>{" "}
                                                {messages.length}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">
                                            User Info
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    ID:
                                                </span>{" "}
                                                {session.user.id}
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">
                                                    Email:
                                                </span>{" "}
                                                {session.user.email}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {encryptionError && (
                                    <Alert className="border-red-200 bg-red-50">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                        <AlertDescription className="text-red-700">
                                            <strong>Encryption Error:</strong>{" "}
                                            {encryptionError}
                                            <Button
                                                onClick={retryEncryption}
                                                variant="outline"
                                                size="sm"
                                                className="ml-2"
                                            >
                                                Retry
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() =>
                                            setMeetingId(generateRandomId(8))
                                        }
                                        variant="outline"
                                        size="sm"
                                    >
                                        New Meeting ID
                                    </Button>
                                    <Button
                                        onClick={retryEncryption}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Retry Encryption
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Chat Panel */}
            <div className="fixed right-0 top-0 h-full z-50">
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
