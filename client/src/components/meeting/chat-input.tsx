"use client";

import { useState, useRef } from "react";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export const ChatInput = ({
    onSendMessage,
    disabled = false,
    placeholder = "Type a message...",
}: ChatInputProps) => {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage("");
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

    return (
        <div className="p-4 border-t border-slate-700 bg-slate-800/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex gap-2">
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
                    {/* Emoji button placeholder - can be enhanced later */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-md transition-all duration-200"
                        disabled={disabled}
                    >
                        <Smile size={16} />
                    </Button>
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
    );
};
