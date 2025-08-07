"use client";

import { useState } from "react";
import {
    CallControls,
    CallParticipantsList,
    CallStatsButton,
    CallingState,
    PaginatedGridLayout,
    SpeakerLayout,
    useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Users, LayoutList, MessageSquare } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Loader from "./loader";
import EndCallButton from "./end-call-button";
import { GroupChatPanel } from "./group-chat-panel";
import { useGroupChat } from "@/hooks/use-group-chat";
import { cn } from "@/lib/utils";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

const MeetingRoom = () => {
    const searchParams = useSearchParams();
    const params = useParams();
    const isPersonalRoom = searchParams
        ? !!searchParams.get("personal")
        : false;
    const router = useRouter();
    const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const { useCallCallingState, useParticipantCount } = useCallStateHooks();

    const callingState = useCallCallingState();
    const participantCount = useParticipantCount();

    // Get meeting ID from URL params
    const meetingId = (params?.id as string) || "default-meeting";

    // Initialize group chat
    const { messages, sendMessage, isConnected } = useGroupChat({
        meetingId,
    });

    if (callingState !== CallingState.JOINED) return <Loader />;

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

    return (
        <section className="relative w-full bg-slate-900 text-white h-[calc(100vh-4rem)]">
            {/* Main Video Area - Scrollable */}
            <div className="relative flex h-full w-full">
                {/* Video Layout Container - Accounts for controls bar */}
                <div className="flex-1 flex flex-col h-full">
                    {/* Scrollable Video Feed Area */}
                    <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-9rem)]">
                        <div className="w-full h-full max-w-7xl mx-auto">
                            <CallLayout />
                        </div>
                    </div>
                </div>

                {/* Participants Sidebar */}
                <div
                    className={cn(
                        "h-full w-80 bg-slate-800 border-l border-slate-700 transition-transform duration-300 ease-in-out",
                        {
                            "translate-x-0": showParticipants && !showChat,
                            "translate-x-full": !showParticipants || showChat,
                        }
                    )}
                >
                    <CallParticipantsList
                        onClose={() => setShowParticipants(false)}
                    />
                </div>

                {/* Chat Sidebar */}
                <GroupChatPanel
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                    messages={messages}
                    onSendMessage={sendMessage}
                    participantCount={participantCount || 0}
                    isConnected={isConnected}
                />
            </div>

            {/* Fixed Meeting Controls Bar at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-800/95 backdrop-blur-md border-t border-slate-700">
                <div className="flex items-center justify-center gap-3 px-6 py-4 h-full">
                    {/* Main Call Controls */}
                    <div className="flex-1 flex justify-center">
                        <CallControls
                            onLeave={() => router.push("/dashboard")}
                        />
                    </div>

                    {/* Additional Controls */}
                    <div className="flex items-center gap-2">
                        {/* Layout Selector */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="bg-slate-700/50 hover:bg-slate-600 text-white border border-slate-600 rounded-lg px-3 py-2"
                                >
                                    <LayoutList size={18} />
                                    <span className="ml-2 hidden sm:inline">
                                        Layout
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white min-w-[160px]">
                                {["Grid", "Speaker-Left", "Speaker-Right"].map(
                                    (item, index) => (
                                        <div key={index}>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setLayout(
                                                        item.toLowerCase() as CallLayoutType
                                                    )
                                                }
                                                className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer"
                                            >
                                                {item}
                                            </DropdownMenuItem>
                                            {index < 2 && (
                                                <DropdownMenuSeparator className="border-slate-600" />
                                            )}
                                        </div>
                                    )
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Participants Toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowParticipants((prev) => !prev);
                                if (showChat) setShowChat(false);
                            }}
                            className={cn(
                                "bg-slate-700/50 hover:bg-slate-600 text-white border border-slate-600 rounded-lg px-3 py-2",
                                {
                                    "bg-blue-600 border-blue-500":
                                        showParticipants && !showChat,
                                }
                            )}
                        >
                            <Users size={18} />
                            <span className="ml-2 hidden sm:inline">
                                {showParticipants && !showChat
                                    ? "Hide"
                                    : "Show"}{" "}
                                Participants
                            </span>
                        </Button>

                        {/* Chat Toggle */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowChat((prev) => !prev);
                                if (showParticipants)
                                    setShowParticipants(false);
                            }}
                            className={cn(
                                "bg-slate-700/50 hover:bg-slate-600 text-white border border-slate-600 rounded-lg px-3 py-2",
                                {
                                    "bg-blue-600 border-blue-500": showChat,
                                }
                            )}
                        >
                            <MessageSquare size={18} />
                            <span className="ml-2 hidden sm:inline">
                                {showChat ? "Hide" : "Show"} Chat
                            </span>
                        </Button>

                        {/* Call Stats */}
                        <div className="hidden md:block">
                            <CallStatsButton />
                        </div>

                        {/* End Call Button */}
                        {!isPersonalRoom && <EndCallButton />}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MeetingRoom;
