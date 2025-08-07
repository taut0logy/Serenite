"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatToastProps {
    message: string;
    userName: string;
    userAvatar?: string;
    onClose: () => void;
    onClick?: () => void;
    autoClose?: boolean;
    duration?: number;
}

export const ChatToast = ({
    message,
    userName,
    userAvatar,
    onClose,
    onClick,
    autoClose = true,
    duration = 5000,
}: ChatToastProps) => {
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [autoClose, duration, onClose]);

    return (
        <div
            className={cn(
                "fixed top-4 right-4 z-50 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-lg",
                "transform transition-all duration-300 ease-in-out",
                "hover:shadow-xl hover:scale-105 cursor-pointer"
            )}
            onClick={onClick}
        >
            <div className="p-3">
                <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={userAvatar} alt={userName} />
                        <AvatarFallback className="bg-slate-600 text-white text-xs">
                            {getInitials(userName)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white truncate">
                                {userName}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X size={12} />
                            </Button>
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="text-xs text-slate-400 mt-2 text-center">
                    Click to open chat
                </div>
            </div>

            {/* Progress bar */}
            {autoClose && (
                <div className="h-1 bg-slate-700 rounded-b-lg overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all chat-toast-progress" />
                </div>
            )}
        </div>
    );
};
