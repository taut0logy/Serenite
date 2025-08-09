/**
 * Enhanced Meeting Room with E2E Encryption Support
 * Integrates encrypted group chat with the meeting infrastructure
 */

"use client";

import { useState, useEffect } from "react";
import {
    CallingState,
    PaginatedGridLayout,
    SpeakerLayout,
    useCallStateHooks,
    useCall,
} from "@stream-io/video-react-sdk";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import Loader from "./loader";
import { EncryptedGroupChatPanel } from "./encrypted-group-chat-panel";
import { GroupChatPanel } from "./group-chat-panel";
import { CustomCallControls } from "./custom-call-controls";
import { EnhancedParticipantsList } from "./participants-list";
import { SpeakingIndicator } from "./speaking-indicator";
import { useGroupChat } from "@/hooks/use-group-chat";
import { useEncryptedGroupChat } from "@/hooks/use-encrypted-group-chat";
import {
    keyManagementService,
    type GroupMember,
} from "@/services/key-management.service";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

interface EnhancedMeetingRoomProps {
    id?: string;
    enableEncryption?: boolean;
}

const EnhancedMeetingRoom = ({
    id,
    enableEncryption = false,
}: EnhancedMeetingRoomProps) => {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const isPersonalRoom = searchParams
        ? !!searchParams.get("personal")
        : false;
    const router = useRouter();
    const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const [encryptionEnabled, setEncryptionEnabled] =
        useState(enableEncryption);

    const { useCallCallingState, useParticipantCount, useParticipants } =
        useCallStateHooks();
    const call = useCall();
    const callingState = useCallCallingState();
    const participantCount = useParticipantCount();
    const participants = useParticipants();

    // Get meeting ID from URL params
    const meetingId = id || "default-meeting";

    // State for group members for encryption
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

    // Update group members when participants change
    useEffect(() => {
        const updateGroupMembers = async () => {
            console.log("🔄 Updating group members...", {
                participantCount: participants?.length || 0,
                currentUserId: session?.user?.id,
                encryptionEnabled,
            });

            if (
                !participants ||
                participants.length === 0 ||
                !session?.user?.id
            ) {
                console.log(
                    "⚠️ No participants or current user, clearing group members"
                );
                setGroupMembers([]);
                return;
            }

            if (!encryptionEnabled) {
                console.log("🔓 Encryption disabled, clearing group members");
                setGroupMembers([]);
                return;
            }

            try {
                const members: GroupMember[] = [];

                for (const participant of participants) {
                    const userId = participant.userId;
                    if (!userId) {
                        console.log("⚠️ Skipping participant with no userId");
                        continue;
                    }

                    console.log(`👤 Processing participant: ${userId}`);

                    // Initialize key management for this user if it's the current user
                    if (userId === session.user.id) {
                        console.log(
                            "🔑 Initializing key management for current user"
                        );
                        try {
                            await keyManagementService.initialize(userId);
                            const publicKey =
                                await keyManagementService.getUserPublicKey();
                            members.push({
                                userId,
                                publicKey,
                                joinedAt: new Date().toISOString(),
                            });
                            console.log(
                                "✅ Added current user to group members"
                            );
                        } catch (error) {
                            console.error(
                                `Failed to get public key for current user ${userId}:`,
                                error
                            );
                        }
                    } else {
                        // For other users, try to fetch their public key from server
                        try {
                            const publicKeys =
                                await keyManagementService.fetchPublicKeys([
                                    userId,
                                ]);
                            const userPublicKey = publicKeys.find(
                                (pk) => pk.userId === userId
                            );

                            if (userPublicKey) {
                                members.push({
                                    userId,
                                    publicKey: userPublicKey.publicKey,
                                    joinedAt: new Date().toISOString(),
                                });
                            } else {
                                console.warn(
                                    `No public key found for user ${userId}, skipping for now`
                                );
                                // Skip users without public keys for now
                                // They would need to join the encryption group themselves
                            }
                        } catch (error) {
                            console.error(
                                `Failed to fetch public key for user ${userId}:`,
                                error
                            );
                            // Skip this user for encryption
                        }
                    }
                }

                console.log(
                    `🔑 Converted ${participants.length} participants to ${members.length} group members`
                );
                setGroupMembers(members);
            } catch (error) {
                console.error(
                    "Failed to convert participants to group members:",
                    error
                );
                setGroupMembers([]);
            }
        };

        if (encryptionEnabled) {
            updateGroupMembers();
        } else {
            setGroupMembers([]);
        }
    }, [participants, session?.user?.id, encryptionEnabled]);

    // Initialize regular chat
    const regularChat = useGroupChat({
        meetingId,
    });

    // Initialize encrypted chat
    const encryptedChat = useEncryptedGroupChat({
        meetingId,
        groupMembers: encryptionEnabled ? groupMembers : [],
    });

    // Debug logging for call state
    useEffect(() => {
        console.log("Enhanced Meeting Room - Calling State:", callingState);
        console.log(
            "Enhanced Meeting Room - Participant count:",
            participantCount
        );
        console.log(
            "Enhanced Meeting Room - Encryption enabled:",
            encryptionEnabled
        );

        // Clear errors when successfully joined
        if (callingState === CallingState.JOINED) {
            setLastError(null);
            setReconnectAttempts(0);
        }
    }, [callingState, participantCount, encryptionEnabled]);

    // Handle participant changes for encryption
    useEffect(() => {
        if (!encryptionEnabled || !participants) return;

        console.log("👥 Participants changed:", {
            count: participants.length,
            userIds: participants.map((p) => p.userId).filter(Boolean),
        });

        // Handle encryption key rotation when participants change
        const handleParticipantChange = async () => {
            try {
                if (groupMembers.length > 0) {
                    console.log(
                        "🔄 Updating encryption for participant change"
                    );
                    // The encrypted chat hook will handle the key rotation internally
                }
            } catch (error) {
                console.error(
                    "Failed to handle participant change for encryption:",
                    error
                );
            }
        };

        handleParticipantChange();
    }, [
        participants,
        encryptionEnabled,
        groupMembers,
        encryptedChat.addGroupMember,
    ]);

    // Handle call disconnection and reconnection
    useEffect(() => {
        if (!call) return;

        const handleReconnection = async () => {
            if (
                (callingState === CallingState.OFFLINE ||
                    callingState === CallingState.RECONNECTING_FAILED) &&
                reconnectAttempts < 3
            ) {
                console.log(
                    `Attempting to reconnect (${reconnectAttempts + 1}/3)...`
                );
                setReconnectAttempts((prev) => prev + 1);

                try {
                    await call.join();
                } catch (error) {
                    console.error("Reconnection failed:", error);
                    setLastError(
                        `Reconnection failed: ${
                            error instanceof Error
                                ? error.message
                                : "Unknown error"
                        }`
                    );
                }
            }
        };

        const timer = setTimeout(handleReconnection, 2000);
        return () => clearTimeout(timer);
    }, [callingState, call, reconnectAttempts]);

    // Toggle encryption mode
    const toggleEncryption = async () => {
        try {
            setEncryptionEnabled(!encryptionEnabled);

            if (!encryptionEnabled && session?.user?.id) {
                // Enabling encryption - initialize if needed
                await keyManagementService.initialize(session.user.id);
            }

            console.log(
                `🔐 Encryption ${
                    !encryptionEnabled ? "enabled" : "disabled"
                } for meeting`
            );
        } catch (error) {
            console.error("Failed to toggle encryption:", error);
        }
    };

    // Handle different calling states
    const renderCallState = () => {
        switch (callingState) {
            case CallingState.JOINING:
                return (
                    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-900">
                        <div className="text-center space-y-4">
                            <Loader />
                            <p className="text-white text-lg">
                                Joining meeting...
                            </p>
                            {encryptionEnabled && (
                                <p className="text-blue-400 text-sm">
                                    🔐 Preparing encrypted chat...
                                </p>
                            )}
                        </div>
                    </div>
                );

            case CallingState.RECONNECTING:
                return (
                    <div className="flex items-center justify-center min-[calc(100vh-4rem)] bg-slate-900">
                        <div className="text-center space-y-4">
                            <RefreshCw className="h-8 w-8 animate-spin text-white mx-auto" />
                            <p className="text-white text-lg">
                                Reconnecting to meeting...
                            </p>
                            <p className="text-slate-400 text-sm">
                                Please wait while we restore your connection...
                            </p>
                        </div>
                    </div>
                );

            case CallingState.OFFLINE:
            case CallingState.RECONNECTING_FAILED:
                return (
                    <div className="flex items-center justify-center min-h-screen bg-slate-900">
                        <div className="text-center space-y-4 max-w-md">
                            <Alert className="border-red-600 bg-red-900/20">
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                <AlertDescription className="text-red-200">
                                    Connection lost.{" "}
                                    {reconnectAttempts < 3
                                        ? "Trying to reconnect..."
                                        : "Unable to reconnect."}
                                    {lastError && (
                                        <div className="mt-2 text-sm text-red-300">
                                            {lastError}
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                            {reconnectAttempts >= 3 && (
                                <Button
                                    onClick={() => {
                                        setReconnectAttempts(0);
                                        setLastError(null);
                                        call?.join().catch((err) => {
                                            setLastError(
                                                `Join failed: ${err.message}`
                                            );
                                        });
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                            )}
                        </div>
                    </div>
                );

            case CallingState.LEFT:
                return (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-900">
                        <div className="text-center space-y-4">
                            <p className="text-white text-lg">
                                You have left the meeting
                            </p>
                            <Button onClick={() => router.push("/dashboard")}>
                                Return to Dashboard
                            </Button>
                        </div>
                    </div>
                );

            case CallingState.JOINED:
                return null; // Render the main meeting UI

            case CallingState.IDLE:
            case CallingState.UNKNOWN:
            default:
                return (
                    <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-900">
                        <div className="text-center space-y-4">
                            <Loader />
                            <p className="text-white text-lg">
                                Connecting to meeting...
                            </p>
                            <p className="text-slate-400 text-sm">
                                State: {callingState}
                            </p>
                            {callingState === CallingState.UNKNOWN && (
                                <Alert className="border-yellow-600 bg-yellow-900/20 max-w-md mx-auto">
                                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                    <AlertDescription className="text-yellow-200">
                                        Connection status unknown. Please check
                                        your internet connection.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>
                );
        }
    };

    // If not in JOINED state, show appropriate loading/error state
    const stateComponent = renderCallState();
    if (stateComponent) return stateComponent;

    const CallLayout = () => {
        switch (layout) {
            case "grid":
                return <PaginatedGridLayout />;
            case "speaker-right":
                return <SpeakerLayout participantsBarPosition="left" />;
            default:
                return <SpeakerLayout participantsBarPosition="right" />;
        }
    };

    const handleToggleParticipants = () => {
        setShowParticipants((prev) => !prev);
        if (showChat) setShowChat(false);
    };

    const handleToggleChat = () => {
        setShowChat((prev) => !prev);
        if (showParticipants) setShowParticipants(false);
    };

    return (
        <TooltipProvider>
            <section className="relative w-full bg-slate-900 text-white h-[calc(100vh-4rem)] overflow-hidden">
                {/* Speaking Indicator */}
                <SpeakingIndicator />

                {/* Encryption Status Indicator */}
                <div className="absolute top-4 left-4 z-30">
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleEncryption}
                                    className={cn(
                                        "h-8 px-3 rounded-full text-xs font-medium transition-all",
                                        encryptionEnabled
                                            ? "bg-green-600/20 text-green-400 border border-green-400/30 hover:bg-green-600/30"
                                            : "bg-slate-600/20 text-slate-400 border border-slate-400/30 hover:bg-slate-600/30"
                                    )}
                                >
                                    {encryptionEnabled ? (
                                        <Shield className="h-3 w-3 mr-1" />
                                    ) : (
                                        <ShieldOff className="h-3 w-3 mr-1" />
                                    )}
                                    {encryptionEnabled
                                        ? "E2E Enabled"
                                        : "E2E Disabled"}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {encryptionEnabled
                                        ? "End-to-end encryption is active. Messages are encrypted and only visible to meeting participants."
                                        : "Click to enable end-to-end encryption for secure messaging."}
                                </p>
                            </TooltipContent>
                        </Tooltip>

                        {encryptionEnabled && (
                            <Badge
                                variant="secondary"
                                className="text-xs bg-blue-600/20 text-blue-400 border-blue-400/30"
                            >
                                {encryptedChat.isEncryptionReady
                                    ? "Ready"
                                    : "Setting up..."}
                            </Badge>
                        )}
                    </div>

                    {/* Encryption Error */}
                    {encryptionEnabled && encryptedChat.encryptionError && (
                        <Alert className="mt-2 max-w-xs border-red-600 bg-red-900/20">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <AlertDescription className="text-red-200 text-xs">
                                {encryptedChat.encryptionError}
                                <Button
                                    onClick={encryptedChat.retryEncryption}
                                    variant="outline"
                                    size="sm"
                                    className="ml-2 h-6 px-2 text-xs"
                                >
                                    Retry
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Main Video Area */}
                <div className="relative flex h-full w-full">
                    {/* Video Layout Container */}
                    <div className="flex-1 flex flex-col h-full">
                        {/* Video Feed Area */}
                        <div className="flex-1 overflow-hidden p-2 pb-20">
                            <div className="w-full h-full max-w-none mx-auto">
                                <CallLayout />
                            </div>
                        </div>
                    </div>

                    {/* Participants Sidebar */}
                    <div
                        className={cn(
                            "meeting-participants-panel absolute right-0 top-0 h-full w-80 bg-slate-800 border-l border-slate-700 transition-transform duration-300 ease-in-out",
                            "shadow-xl z-40",
                            {
                                "translate-x-0": showParticipants && !showChat,
                                "translate-x-full":
                                    !showParticipants || showChat,
                            }
                        )}
                    >
                        <EnhancedParticipantsList
                            onClose={() => setShowParticipants(false)}
                        />
                    </div>

                    {/* Chat Sidebar - Encrypted or Regular */}
                    <div
                        className={cn(
                            "meeting-chat-panel absolute right-0 top-0 h-full transition-transform duration-300 ease-in-out",
                            "shadow-xl z-50",
                            {
                                "translate-x-0": showChat,
                                "translate-x-full": !showChat,
                            }
                        )}
                    >
                        {encryptionEnabled ? (
                            <EncryptedGroupChatPanel
                                isOpen={showChat}
                                onClose={() => setShowChat(false)}
                                messages={encryptedChat.messages}
                                onSendMessage={encryptedChat.sendMessage}
                                participantCount={participantCount || 0}
                                isConnected={encryptedChat.isConnected}
                                isEncryptionReady={
                                    encryptedChat.isEncryptionReady
                                }
                                encryptionError={encryptedChat.encryptionError}
                                onRetryEncryption={
                                    encryptedChat.retryEncryption
                                }
                            />
                        ) : (
                            <GroupChatPanel
                                isOpen={showChat}
                                onClose={() => setShowChat(false)}
                                messages={regularChat.messages}
                                onSendMessage={regularChat.sendMessage}
                                participantCount={participantCount || 0}
                                isConnected={regularChat.isConnected}
                            />
                        )}
                    </div>
                </div>

                {/* Custom Call Controls */}
                <CustomCallControls
                    onLeave={() => router.push("/dashboard")}
                    layout={layout}
                    onLayoutChange={setLayout}
                    showParticipants={showParticipants}
                    onToggleParticipants={handleToggleParticipants}
                    showChat={showChat}
                    onToggleChat={handleToggleChat}
                    isPersonalRoom={isPersonalRoom}
                />

                {/* Encryption Status Indicator */}
                {!enableEncryption && (
                    <div className="absolute bottom-24 left-4 z-50">
                        <button
                            onClick={() => setEncryptionEnabled(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                            title="Enable encryption for this meeting"
                        >
                            🔒 Enable Encryption
                        </button>
                    </div>
                )}

                {encryptionEnabled && (
                    <div className="absolute bottom-24 left-4 z-50">
                        <div className="bg-green-900/80 text-green-100 px-3 py-2 rounded-lg text-sm">
                            🔐 Encryption Active
                            {encryptedChat.isEncryptionReady ? " ✅" : " ⏳"}
                            {encryptedChat.encryptionError && (
                                <div className="text-red-300 text-xs mt-1">
                                    Error: {encryptedChat.encryptionError}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </TooltipProvider>
    );
};

export default EnhancedMeetingRoom;
