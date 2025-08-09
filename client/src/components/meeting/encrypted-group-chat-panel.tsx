/**
 * Encrypted Group Chat Panel Component
 * Extends the existing GroupChatPanel with encryption indicators and error handling
 */

import { useState, useRef, useEffect } from "react";
import {
    X,
    MessageSquare,
    Users as UsersIcon,
    Lock,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChatMessageComponent, type ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";

interface DecryptedChatMessage extends ChatMessage {
    isDecrypted: boolean;
    decryptionError?: string;
}

interface EncryptedGroupChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: DecryptedChatMessage[];
    onSendMessage: (message: string) => void;
    participantCount: number;
    isConnected: boolean;
    isEncryptionReady: boolean;
    encryptionError: string | null;
    onRetryEncryption: () => void;
}

export const EncryptedGroupChatPanel = ({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    participantCount,
    isConnected,
    isEncryptionReady,
    encryptionError,
    onRetryEncryption,
}: EncryptedGroupChatPanelProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    // Track unread messages when panel is closed
    useEffect(() => {
        if (!isOpen && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage.isCurrentUser) {
                setUnreadCount((prev) => prev + 1);
            }
        } else if (isOpen) {
            setUnreadCount(0);
        }
    }, [messages, isOpen]);

    const getEncryptionStatusColor = () => {
        if (encryptionError) return "text-red-400";
        if (!isEncryptionReady) return "text-yellow-400";
        return "text-green-400";
    };

    const getEncryptionStatusText = () => {
        if (encryptionError) return "Encryption Error";
        if (!isEncryptionReady) return "Setting up encryption...";
        return "End-to-end encrypted";
    };

    return (
        <div
            className={cn(
                "meeting-chat-panel h-full w-80 bg-slate-800 border-l border-slate-700 transition-transform duration-300 ease-in-out flex flex-col",
                {
                    "translate-x-0": isOpen,
                    "translate-x-full": !isOpen,
                }
            )}
        >
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/90 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare size={20} className="text-blue-400" />
                        <h3 className="font-medium text-white">Group Chat</h3>
                        {unreadCount > 0 && !isOpen && (
                            <Badge
                                variant="destructive"
                                className="text-xs px-1.5 py-0.5"
                            >
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                        <X size={16} />
                    </Button>
                </div>

                {/* Participants and Connection Status */}
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                    <UsersIcon size={14} />
                    <span>
                        {participantCount} participant
                        {participantCount !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                        <div
                            className={cn("w-2 h-2 rounded-full", {
                                "bg-green-500": isConnected,
                                "bg-red-500": !isConnected,
                            })}
                        />
                        <span className="text-xs">
                            {isConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>

                {/* Encryption Status */}
                <div className="flex items-center gap-2 mt-2 text-xs">
                    <Lock size={12} className={getEncryptionStatusColor()} />
                    <span className={getEncryptionStatusColor()}>
                        {getEncryptionStatusText()}
                    </span>
                    {encryptionError && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRetryEncryption}
                            className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                            <RefreshCw size={12} className="mr-1" />
                            Retry
                        </Button>
                    )}
                </div>
            </div>

            {/* Encryption Error Alert */}
            {encryptionError && (
                <div className="p-2">
                    <Alert className="border-red-500/50 bg-red-500/10">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-200 text-sm">
                            {encryptionError}
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Messages Area - Account for controls height */}
            <div className="flex-1 flex flex-col min-h-0 pb-20">
                <ScrollArea ref={scrollAreaRef} className="flex-1 px-2">
                    <div className="py-2">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center text-slate-400">
                                <MessageSquare
                                    size={32}
                                    className="mb-2 opacity-50"
                                />
                                <p className="text-sm">No messages yet</p>
                                <p className="text-xs">
                                    Start the conversation!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {messages.map((message) => (
                                    <div key={message.id} className="relative">
                                        <ChatMessageComponent
                                            message={message}
                                        />
                                        {/* Encryption indicator */}
                                        {message.userId !== "system" && (
                                            <div className="absolute top-1 right-2">
                                                {message.isDecrypted ? (
                                                    <div title="Message decrypted">
                                                        <Lock
                                                            size={10}
                                                            className="text-green-500 opacity-70"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        title={
                                                            message.decryptionError ||
                                                            "Decryption failed"
                                                        }
                                                    >
                                                        <AlertTriangle
                                                            size={10}
                                                            className="text-red-500 opacity-70"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Chat Input - Fixed at bottom but above controls */}
                <div className="absolute bottom-20 left-0 right-0 bg-slate-800 border-t border-slate-700">
                    <ChatInput
                        onSendMessage={onSendMessage}
                        disabled={!isConnected || !isEncryptionReady}
                        placeholder={
                            !isConnected
                                ? "Connecting..."
                                : !isEncryptionReady
                                ? "Setting up encryption..."
                                : "Type an encrypted message..."
                        }
                    />
                </div>
            </div>
        </div>
    );
};
