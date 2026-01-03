"use client";

import { useState, useRef } from "react";
import { Send, Smile, X, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ReplyInfo } from "./chat-message";

// Common emoji categories
const EMOJI_CATEGORIES = {
    "Smileys": ["😊", "😂", "🥹", "😍", "🤗", "😢", "😤", "🤔", "😴", "🥺"],
    "Gestures": ["👍", "👎", "👏", "🙌", "🤝", "💪", "🙏", "❤️", "💔", "✨"],
    "Objects": ["🎉", "🔥", "💡", "📌", "✅", "❌", "⭐", "🌟", "💬", "🎯"],
};

interface ChatInputProps {
    onSendMessage: (message: string, replyTo?: ReplyInfo) => void;
    disabled?: boolean;
    placeholder?: string;
    replyingTo?: ReplyInfo | null;
    onCancelReply?: () => void;
}

export const ChatInput = ({
    onSendMessage,
    disabled = false,
    placeholder = "Type a message...",
    replyingTo,
    onCancelReply,
}: ChatInputProps) => {
    const [message, setMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim(), replyingTo || undefined);
            setMessage("");
            onCancelReply?.();
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleTextareaChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        setMessage(e.target.value);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // Max 4-5 lines
            textareaRef.current.style.height = `${newHeight}px`;
        }
    };

    const insertEmoji = (emoji: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newMessage = message.slice(0, start) + emoji + message.slice(end);
            setMessage(newMessage);
            // Set cursor position after emoji
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        } else {
            setMessage(message + emoji);
        }
        setShowEmojiPicker(false);
    };

    const truncateContent = (content: string, maxLength = 40) => {
        if (content.length <= maxLength) return content;
        return content.slice(0, maxLength) + "...";
    };

    return (
        <div className="border-t border-slate-700 bg-slate-800/80 backdrop-blur-sm">
            {/* Reply preview bar */}
            {replyingTo && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border-b border-slate-600">
                    <CornerDownRight className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-xs text-blue-400 font-medium">
                            Replying to {replyingTo.userName}
                        </span>
                        <p className="text-xs text-slate-400 truncate">
                            {truncateContent(replyingTo.content)}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-600"
                        onClick={onCancelReply}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className="p-4">
                <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={handleTextareaChange}
                            onKeyPress={handleKeyPress}
                            placeholder={placeholder}
                            disabled={disabled}
                            rows={1}
                            className={cn(
                                "chat-textarea w-full bg-slate-700/70 border border-slate-600 text-white placeholder:text-slate-400",
                                "focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none",
                                "rounded-lg px-3 py-2 pr-10 resize-none transition-all duration-200",
                                "text-sm leading-5 backdrop-blur-sm",
                                "hover:bg-slate-700/80 focus:bg-slate-700/80"
                            )}
                            maxLength={500}
                        />
                        {/* Emoji picker button */}
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-yellow-400 hover:bg-slate-600/50 rounded-md transition-all duration-200"
                                    disabled={disabled}
                                >
                                    <Smile size={16} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-72 p-3 bg-slate-800 border-slate-700"
                                align="end"
                                side="top"
                            >
                                <div className="space-y-3">
                                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                                        <div key={category}>
                                            <p className="text-xs text-slate-400 mb-1.5">{category}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {emojis.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-700 rounded transition-colors"
                                                        onClick={() => insertEmoji(emoji)}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        type="submit"
                        disabled={disabled || !message.trim()}
                        className={cn(
                            "bg-blue-600 hover:bg-blue-700 text-white border-0 self-end rounded-lg transition-all duration-200",
                            "disabled:bg-slate-600 disabled:text-slate-400",
                            "w-10 h-10 p-0 min-w-0"
                        )}
                        size="icon"
                    >
                        <Send size={16} />
                    </Button>
                </form>

                {message.length > 400 && (
                    <div className="text-xs text-slate-400 mt-1 text-right">
                        {message.length}/500
                    </div>
                )}
            </div>
        </div>
    );
};

