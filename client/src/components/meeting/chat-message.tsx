"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Reply, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export interface ReplyInfo {
    id: string;
    userName: string;
    content: string;
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: Date;
    isCurrentUser: boolean;
    replyTo?: ReplyInfo;
    isDeleted?: boolean;
}

interface ChatMessageProps {
    message: ChatMessage;
    onReply?: (message: ChatMessage) => void;
    onDelete?: (messageId: string) => void;
}

export const ChatMessageComponent = ({ message, onReply, onDelete }: ChatMessageProps) => {
    const [showActions, setShowActions] = useState(false);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Truncate reply preview
    const truncateContent = (content: string, maxLength = 60) => {
        if (content.length <= maxLength) return content;
        return content.slice(0, maxLength) + "...";
    };

    // System messages
    if (message.userId === "system") {
        return (
            <div className="flex justify-center py-2">
                <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    // Deleted message
    if (message.isDeleted) {
        return (
            <div className={cn(
                "flex gap-2 py-1",
                message.isCurrentUser ? "flex-row-reverse" : "flex-row"
            )}>
                {!message.isCurrentUser && (
                    <Avatar className="h-7 w-7 shrink-0 mt-auto">
                        <AvatarFallback className="bg-slate-700 text-white text-[10px] font-medium">
                            {getInitials(message.userName)}
                        </AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 bg-slate-700/50",
                    message.isCurrentUser ? "rounded-br-sm" : "rounded-bl-sm"
                )}>
                    <p className="text-xs text-slate-500 italic">
                        🚫 This message was deleted
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "group flex gap-2 py-1",
                message.isCurrentUser ? "flex-row-reverse" : "flex-row"
            )}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Avatar - only for others */}
            {!message.isCurrentUser && (
                <Avatar className="h-7 w-7 shrink-0 mt-auto">
                    <AvatarImage src={message.userAvatar} alt={message.userName} />
                    <AvatarFallback className="bg-slate-600 text-white text-[10px] font-medium">
                        {getInitials(message.userName)}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Message Bubble */}
            <div className={cn(
                "relative max-w-[75%] rounded-2xl px-3 py-2",
                message.isCurrentUser
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-slate-700 text-slate-100 rounded-bl-sm"
            )}>
                {/* Sender name - only for others */}
                {!message.isCurrentUser && (
                    <p className="text-xs font-medium text-blue-400 mb-0.5">
                        {message.userName}
                    </p>
                )}

                {/* Reply preview - Telegram style */}
                {message.replyTo && (
                    <div className={cn(
                        "mb-2 px-2 py-1 rounded-sm border-l-2",
                        message.isCurrentUser
                            ? "bg-blue-500/30 border-blue-300"
                            : "bg-slate-600/50 border-green-400"
                    )}>
                        <p className={cn(
                            "text-xs font-medium",
                            message.isCurrentUser ? "text-blue-200" : "text-green-400"
                        )}>
                            {message.replyTo.userName}
                        </p>
                        <p className={cn(
                            "text-xs truncate",
                            message.isCurrentUser ? "text-blue-100/80" : "text-slate-400"
                        )}>
                            {truncateContent(message.replyTo.content)}
                        </p>
                    </div>
                )}

                {/* Message content with markdown */}
                <div className={cn(
                    "text-sm break-words leading-relaxed",
                    "prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed",
                    message.isCurrentUser
                        ? "prose-invert prose-code:bg-blue-500/50 prose-a:text-blue-200"
                        : "prose-invert prose-code:bg-slate-600 prose-a:text-blue-400",
                    "prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                )}>
                    <ReactMarkdown
                        components={{
                            p: ({ children }) => <span>{children}</span>,
                            a: ({ href, children }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        "hover:underline",
                                        message.isCurrentUser ? "text-blue-200" : "text-blue-400"
                                    )}
                                >
                                    {children}
                                </a>
                            ),
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>

                {/* Time */}
                <p className={cn(
                    "text-[10px] text-right mt-1",
                    message.isCurrentUser ? "text-blue-200/70" : "text-slate-500"
                )}>
                    {format(message.timestamp, "HH:mm")}
                </p>

                {/* Hover actions */}
                {showActions && (onReply || onDelete) && (
                    <div className={cn(
                        "absolute top-0 flex items-center gap-0.5 bg-slate-800 rounded-md shadow-lg border border-slate-600 p-0.5",
                        message.isCurrentUser ? "left-0 -translate-x-full -ml-1" : "right-0 translate-x-full ml-1"
                    )}>
                        {onReply && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
                                onClick={() => onReply(message)}
                                title="Reply"
                            >
                                <Reply className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {onDelete && message.isCurrentUser && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                onClick={() => {
                                    console.log("Delete clicked for message:", message.id);
                                    onDelete(message.id);
                                }}
                                title="Delete"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


