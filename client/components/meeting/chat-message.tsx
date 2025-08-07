"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: Date;
    isCurrentUser: boolean;
}

interface ChatMessageProps {
    message: ChatMessage;
}

export const ChatMessageComponent = ({ message }: ChatMessageProps) => {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div
            className={cn(
                "flex gap-3 p-3 rounded-lg transition-colors hover:bg-slate-700/30",
                {
                    "bg-blue-600/10 border-l-2 border-l-blue-500":
                        message.isCurrentUser,
                }
            )}
        >
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={message.userAvatar} alt={message.userName} />
                <AvatarFallback className="bg-slate-600 text-white text-xs">
                    {getInitials(message.userName)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">
                        {message.userName}
                        {message.isCurrentUser && (
                            <span className="text-blue-400 ml-1">(You)</span>
                        )}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                        {format(message.timestamp, "HH:mm")}
                    </span>
                </div>
                <p className="text-sm text-slate-200 break-words leading-relaxed">
                    {message.content}
                </p>
            </div>
        </div>
    );
};
