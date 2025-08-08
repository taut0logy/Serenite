"use client";

import {
    useCallStateHooks,
    useCall,
    CallStatsButton,
} from "@stream-io/video-react-sdk";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    MonitorSpeaker,
    Users,
    MessageSquare,
    LayoutList,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { DeviceControlsPanel } from "./device-controls-panel";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

interface CustomCallControlsProps {
    onLeave?: () => void;
    layout: CallLayoutType;
    onLayoutChange: (layout: CallLayoutType) => void;
    showParticipants: boolean;
    onToggleParticipants: () => void;
    showChat: boolean;
    onToggleChat: () => void;
    isPersonalRoom?: boolean;
}

export const CustomCallControls = ({
    onLeave,
    layout,
    onLayoutChange,
    showParticipants,
    onToggleParticipants,
    showChat,
    onToggleChat,
    isPersonalRoom = false,
}: CustomCallControlsProps) => {
    const call = useCall();
    const router = useRouter();
    const { useCameraState, useMicrophoneState, useScreenShareState } =
        useCallStateHooks();

    const { camera, isMute: isCameraMuted } = useCameraState();
    const { microphone, isMute: isMicMuted } = useMicrophoneState();
    const { screenShare, isMute: isScreenShareOff } = useScreenShareState();

    const handleEndCall = async () => {
        if (call) {
            await call.endCall();
        }
        if (onLeave) {
            onLeave();
        } else {
            router.push("/dashboard");
        }
    };

    const toggleCamera = () => {
        camera.toggle();
    };

    const toggleMicrophone = () => {
        microphone.toggle();
    };

    const toggleScreenShare = () => {
        screenShare.toggle();
    };

    return (
        <div className="meeting-controls-bar absolute bottom-0 left-0 right-0 h-18 bg-slate-800/95 backdrop-blur-md border-t border-slate-700">
            <div className="flex items-center justify-center gap-2 px-6 py-3 h-full max-w-7xl mx-auto">
                {/* Main Controls - Center */}
                <div className="flex items-center gap-3">
                    {/* Microphone Toggle */}
                    <Button
                        onClick={toggleMicrophone}
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "custom-call-control-btn w-12 h-12 rounded-lg border transition-all duration-200",
                            isMicMuted
                                ? "bg-red-600 hover:bg-red-700 border-red-500 text-white custom-call-control-btn--active"
                                : "bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white"
                        )}
                    >
                        {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </Button>

                    {/* Camera Toggle */}
                    <Button
                        onClick={toggleCamera}
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "custom-call-control-btn w-12 h-12 rounded-lg border transition-all duration-200",
                            isCameraMuted
                                ? "bg-red-600 hover:bg-red-700 border-red-500 text-white custom-call-control-btn--active"
                                : "bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white"
                        )}
                    >
                        {isCameraMuted ? (
                            <VideoOff size={20} />
                        ) : (
                            <Video size={20} />
                        )}
                    </Button>

                    {/* Screen Share Toggle */}
                    <Button
                        onClick={toggleScreenShare}
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "custom-call-control-btn w-12 h-12 rounded-lg border transition-all duration-200",
                            !isScreenShareOff
                                ? "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white custom-call-control-btn--active"
                                : "bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white"
                        )}
                    >
                        {!isScreenShareOff ? (
                            <MonitorSpeaker size={20} />
                        ) : (
                            <MonitorSpeaker size={20} className="opacity-60" />
                        )}
                    </Button>

                    {/* End Call */}
                    {!isPersonalRoom && (
                        <Button
                            onClick={handleEndCall}
                            variant="ghost"
                            size="icon"
                            className="custom-call-control-btn w-12 h-12 rounded-lg border bg-red-600 hover:bg-red-700 border-red-500 text-white transition-all duration-200 custom-call-control-btn--active"
                        >
                            <PhoneOff size={20} />
                        </Button>
                    )}
                </div>

                {/* Secondary Controls - Right */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Device Settings */}
                    <DeviceControlsPanel />

                    {/* Participants Toggle */}
                    <Button
                        onClick={onToggleParticipants}
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "custom-call-control-btn w-10 h-10 rounded-lg border transition-all duration-200",
                            showParticipants && !showChat
                                ? "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white custom-call-control-btn--active"
                                : "bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white"
                        )}
                    >
                        <Users size={18} />
                    </Button>

                    {/* Chat Toggle */}
                    <Button
                        onClick={onToggleChat}
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "custom-call-control-btn w-10 h-10 rounded-lg border transition-all duration-200",
                            showChat
                                ? "bg-blue-600 hover:bg-blue-700 border-blue-500 text-white custom-call-control-btn--active"
                                : "bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white"
                        )}
                    >
                        <MessageSquare size={18} />
                    </Button>

                    {/* More Options Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="custom-call-control-btn w-10 h-10 rounded-lg border bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white transition-all duration-200"
                            >
                                <MoreHorizontal size={18} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="bg-slate-800 border-slate-700 text-white min-w-[200px]"
                        >
                            {/* Layout Options */}
                            <DropdownMenuItem
                                className="hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-3 py-2"
                                onSelect={() => {}}
                            >
                                <LayoutList size={16} className="mr-2" />
                                Layout Options
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="border-slate-600" />

                            <DropdownMenuItem
                                onClick={() => onLayoutChange("grid")}
                                className={cn(
                                    "hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-4 py-1.5 text-sm",
                                    layout === "grid" && "bg-slate-700"
                                )}
                            >
                                Grid View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onLayoutChange("speaker-left")}
                                className={cn(
                                    "hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-4 py-1.5 text-sm",
                                    layout === "speaker-left" && "bg-slate-700"
                                )}
                            >
                                Speaker Left
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onLayoutChange("speaker-right")}
                                className={cn(
                                    "hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-4 py-1.5 text-sm",
                                    layout === "speaker-right" && "bg-slate-700"
                                )}
                            >
                                Speaker Right
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="border-slate-600" />

                            {/* Call Stats */}
                            <div className="px-3 py-2">
                                <CallStatsButton />
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
};
