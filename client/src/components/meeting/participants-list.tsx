"use client";

import {
    CallParticipantsList as StreamParticipantsList,
    useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { X, Users, Crown, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EnhancedParticipantsListProps {
    onClose: () => void;
}

export const EnhancedParticipantsList = ({
    onClose,
}: EnhancedParticipantsListProps) => {
    const { useParticipants, useLocalParticipant } = useCallStateHooks();
    const participants = useParticipants();
    const localParticipant = useLocalParticipant();

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="h-full flex flex-col bg-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/90 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users size={20} className="text-blue-400" />
                        <div>
                            <h3 className="font-semibold text-white">
                                Participants
                            </h3>
                            <p className="text-sm text-slate-400">
                                {participants.length}{" "}
                                {participants.length === 1
                                    ? "person"
                                    : "people"}{" "}
                                in call
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                    >
                        <X size={16} />
                    </Button>
                </div>
            </div>

            {/* Participants List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {participants.map((participant) => {
                        const isLocal =
                            participant.sessionId ===
                            localParticipant?.sessionId;
                        const isHost =
                            participant.roles?.includes("host") ||
                            participant.roles?.includes("admin");

                        return (
                            <div
                                key={participant.sessionId}
                                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                            >
                                {/* Avatar */}
                                <div className="relative">
                                    <Avatar className="w-10 h-10 ring-2 ring-slate-600">
                                        <AvatarImage
                                            src={participant.image}
                                            alt={
                                                participant.name ||
                                                participant.userId
                                            }
                                        />
                                        <AvatarFallback className="bg-slate-600 text-white text-sm font-medium">
                                            {getInitials(
                                                participant.name ||
                                                    participant.userId
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                    {/* Host indicator */}
                                    {isHost && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                            <Crown
                                                size={12}
                                                className="text-yellow-900"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Participant Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-white truncate">
                                            {participant.name ||
                                                participant.userId}
                                        </p>
                                        {isLocal && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs bg-blue-600/20 text-blue-400 border-blue-400/30"
                                            >
                                                You
                                            </Badge>
                                        )}
                                        {isHost && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs bg-yellow-600/20 text-yellow-400 border-yellow-400/30"
                                            >
                                                Host
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Connection Status */}
                                    <div className="flex items-center gap-1 mt-1">
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                participant.connectionQuality ===
                                                0
                                                    ? "bg-red-500"
                                                    : participant.connectionQuality ===
                                                      1
                                                    ? "bg-yellow-500"
                                                    : participant.connectionQuality ===
                                                      2
                                                    ? "bg-green-500"
                                                    : "bg-slate-500"
                                            }`}
                                        />
                                        <span className="text-xs text-slate-400">
                                            {participant.connectionQuality === 0
                                                ? "poor"
                                                : participant.connectionQuality ===
                                                  1
                                                ? "good"
                                                : participant.connectionQuality ===
                                                  2
                                                ? "excellent"
                                                : "unknown"}{" "}
                                            connection
                                        </span>
                                    </div>
                                </div>

                                {/* Audio/Video Status */}
                                <div className="flex items-center gap-2">
                                    {/* Microphone Status */}
                                    <div
                                        className={`p-1.5 rounded-full ${
                                            participant.audioStream
                                                ? "bg-green-600/20 text-green-400"
                                                : "bg-red-600/20 text-red-400"
                                        }`}
                                    >
                                        {participant.audioStream ? (
                                            <Mic size={14} />
                                        ) : (
                                            <MicOff size={14} />
                                        )}
                                    </div>

                                    {/* Video Status */}
                                    <div
                                        className={`p-1.5 rounded-full ${
                                            participant.videoStream
                                                ? "bg-green-600/20 text-green-400"
                                                : "bg-red-600/20 text-red-400"
                                        }`}
                                    >
                                        {participant.videoStream ? (
                                            <Video size={14} />
                                        ) : (
                                            <VideoOff size={14} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Footer with Stream's Original Component (hidden but available for fallback) */}
            <div className="hidden">
                <StreamParticipantsList onClose={onClose} />
            </div>
        </div>
    );
};
