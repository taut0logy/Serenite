"use client";

import { useState, useRef, useEffect } from "react";
import { X, MessageSquare, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatMessageComponent, type ChatMessage, type ReplyInfo } from "./chat-message";
import { ChatInput } from "./chat-input";
import { cn } from "@/lib/utils";

interface GroupChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (message: string, replyTo?: ReplyInfo) => void;
    onDeleteMessage?: (messageId: string) => void;
    participantCount: number;
    isConnected: boolean;
}

export const GroupChatPanel = ({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    onDeleteMessage,
    participantCount,
    isConnected,
}: GroupChatPanelProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);

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
            if (!lastMessage.isCurrentUser && !lastMessage.isDeleted) {
                setUnreadCount((prev) => prev + 1);
            }
        } else if (isOpen) {
            setUnreadCount(0);
        }
    }, [messages, isOpen]);

    // Handle reply click
    const handleReply = (message: ChatMessage) => {
        setReplyingTo({
            id: message.id,
            userName: message.userName,
            content: message.content,
        });
    };

    // Handle cancel reply
    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    // Handle send with reply
    const handleSendMessage = (content: string, replyTo?: ReplyInfo) => {
        onSendMessage(content, replyTo);
        setReplyingTo(null);
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
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <ScrollArea ref={scrollAreaRef} className="flex-1 px-2 h-full">
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
                                    <ChatMessageComponent
                                        key={message.id}
                                        message={message}
                                        onReply={handleReply}
                                        onDelete={onDeleteMessage}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Input */}
            <div className="flex-shrink-0 border-t border-slate-700">
                <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={!isConnected}
                    placeholder={
                        isConnected ? "Type a message..." : "Connecting..."
                    }
                    replyingTo={replyingTo}
                    onCancelReply={handleCancelReply}
                />
            </div>
        </div>
    );
};

