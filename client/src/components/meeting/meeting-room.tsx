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

import Loader from "./loader";
import { GroupChatPanel } from "./group-chat-panel";
import { CallControls } from "./call-controls";
import { EnhancedParticipantsList } from "./participants-list";
import { SpeakingIndicator } from "./speaking-indicator";
import { useGroupChat } from "@/hooks/use-group-chat";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

const MeetingRoom = ({ id }: { id?: string }) => {
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

    const { useCallCallingState, useParticipantCount } = useCallStateHooks();
    const call = useCall();
    const callingState = useCallCallingState();
    const participantCount = useParticipantCount();

    // Get meeting ID from URL params
    const meetingId = id || "default-meeting";

    // Initialize group chat
    const { messages, sendMessage, deleteMessage, isConnected } = useGroupChat({
        meetingId,
    });

    // Debug logging for call state
    useEffect(() => {
        console.log("Meeting Room - Calling State:", callingState);
        console.log("Meeting Room - Call object:", call);
        console.log("Meeting Room - Participant count:", participantCount);

        // Clear errors when successfully joined
        if (callingState === CallingState.JOINED) {
            setLastError(null);
            setReconnectAttempts(0);
        }
    }, [callingState, call, participantCount]);

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
                        `Reconnection failed: ${error instanceof Error
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

    // Handle different calling states
    const renderCallState = () => {
        switch (callingState) {
            case CallingState.JOINING:
                return (
                    <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-slate-900">
                        <div className="text-center space-y-4">
                            <Loader />
                            <p className="text-white text-lg">
                                Joining meeting...
                            </p>
                        </div>
                    </div>
                );

            case CallingState.RECONNECTING:
                return (
                    <div className="flex items-center justify-center min-[calc(100vh-65px)] bg-slate-900">
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
                    <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-slate-900">
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
                    <div className="flex items-center justify-center h-[calc(100vh-65px)] bg-slate-900">
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
                    <div className="flex items-center justify-center h-[calc(100vh-65px)] bg-slate-900">
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
        <section className="relative w-full bg-slate-900 text-white h-[calc(100vh-65px)] flex flex-col overflow-hidden">
            {/* Speaking Indicator */}
            <SpeakingIndicator />

            {/* Main Video Area */}
            <div className="relative flex flex-1 w-full min-h-0">
                {/* Video Layout Container - Properly sized for different layouts */}
                <div className="flex-1 flex flex-col h-full min-h-0">
                    {/* Video Feed Area with improved grid sizing */}
                    <div className="flex-1 overflow-y-auto p-2 min-h-0">
                        <CallLayout />
                    </div>
                </div>

                {/* Participants Sidebar with proper z-index */}
                <div
                    className={cn(
                        "meeting-participants-panel absolute right-0 top-0 h-full w-80 bg-slate-800 border-l border-slate-700 transition-transform duration-300 ease-in-out",
                        "shadow-xl z-40",
                        {
                            "translate-x-0": showParticipants && !showChat,
                            "translate-x-full": !showParticipants || showChat,
                        }
                    )}
                >
                    <EnhancedParticipantsList
                        onClose={() => setShowParticipants(false)}
                    />
                </div>

                {/* Chat Sidebar with higher z-index and proper spacing */}
                <div
                    className={cn(
                        "meeting-chat-panel absolute right-0 top-0 h-full transition-transform duration-300 ease-in-out",
                        "shadow-xl",
                        {
                            "translate-x-0": showChat,
                            "translate-x-full": !showChat,
                        }
                    )}
                >
                    <GroupChatPanel
                        isOpen={showChat}
                        onClose={() => setShowChat(false)}
                        messages={messages}
                        onSendMessage={sendMessage}
                        onDeleteMessage={deleteMessage}
                        participantCount={participantCount || 0}
                        isConnected={isConnected}
                    />
                </div>
            </div>

            <div className="flex-shrink-0">
                <CallControls
                    onLeave={() => router.push("/dashboard")}
                    layout={layout}
                    onLayoutChange={setLayout}
                    showParticipants={showParticipants}
                    onToggleParticipants={handleToggleParticipants}
                    showChat={showChat}
                    onToggleChat={handleToggleChat}
                    isPersonalRoom={isPersonalRoom}
                />
            </div>
        </section>
    );
};

export default MeetingRoom;
