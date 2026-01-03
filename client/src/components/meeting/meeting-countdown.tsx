"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetingCountdownProps {
    meetingId: string;
    endTime: Date;
    onMeetingEnd: () => void;
    onDismissWarning?: () => void;
}

export function MeetingCountdown({
    endTime,
    onMeetingEnd,
}: MeetingCountdownProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const WARNING_THRESHOLD = 10 * 60 * 1000; // 10 minutes
    const CRITICAL_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const FINAL_THRESHOLD = 60 * 1000; // 1 minute

    // Format time remaining
    const formatTime = useCallback((ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }, []);

    // Calculate remaining time
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const remaining = new Date(endTime).getTime() - now.getTime();
            setTimeLeft(remaining);

            // Meeting ended
            if (remaining <= 0) {
                onMeetingEnd();
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [endTime, onMeetingEnd]);

    // Determine warning level
    const getWarningLevel = () => {
        if (timeLeft <= FINAL_THRESHOLD) return "final";
        if (timeLeft <= CRITICAL_THRESHOLD) return "critical";
        if (timeLeft <= WARNING_THRESHOLD) return "warning";
        return "normal";
    };

    const warningLevel = getWarningLevel();

    return (
        <div className="fixed top-1/2 right-0 -translate-y-1/2 z-40">
            <AnimatePresence mode="wait">
                {isCollapsed ? (
                    // Collapsed state - just a small tab
                    <motion.button
                        key="collapsed"
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 50, opacity: 0 }}
                        onClick={() => setIsCollapsed(false)}
                        className={cn(
                            "flex items-center gap-1 px-2 py-3 rounded-l-lg shadow-lg transition-colors",
                            warningLevel === "normal" && "bg-slate-800/90 text-slate-300 hover:bg-slate-700/90",
                            warningLevel === "warning" && "bg-amber-600/90 text-white hover:bg-amber-500/90",
                            warningLevel === "critical" && "bg-orange-600/90 text-white hover:bg-orange-500/90",
                            warningLevel === "final" && "bg-red-600/90 text-white hover:bg-red-500/90"
                        )}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {/* Warning indicator dot */}
                        {warningLevel !== "normal" && (
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                warningLevel === "warning" && "bg-amber-300 animate-pulse",
                                warningLevel === "critical" && "bg-orange-300 animate-pulse",
                                warningLevel === "final" && "bg-red-300 animate-ping"
                            )} />
                        )}
                    </motion.button>
                ) : (
                    // Expanded state - full countdown
                    <motion.div
                        key="expanded"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className={cn(
                            "flex items-center rounded-l-xl shadow-xl overflow-hidden",
                            warningLevel === "normal" && "bg-slate-800/95",
                            warningLevel === "warning" && "bg-amber-600/95",
                            warningLevel === "critical" && "bg-orange-600/95",
                            warningLevel === "final" && "bg-red-600/95"
                        )}
                    >
                        {/* Collapse button */}
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className={cn(
                                "p-2 group",
                                warningLevel === "normal" ? "text-slate-400" : "text-white/70"
                            )}
                        >
                            <ChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Time display */}
                        <div className="flex items-center gap-2 pr-4 py-2">
                            <Clock className={cn(
                                "w-4 h-4",
                                warningLevel === "normal" ? "text-slate-400" : "text-white/80"
                            )} />
                            <span className={cn(
                                "font-mono text-lg font-semibold tabular-nums",
                                warningLevel === "normal" && "text-slate-200",
                                warningLevel !== "normal" && "text-white",
                                (warningLevel === "critical" || warningLevel === "final") && "animate-pulse"
                            )}>
                                {formatTime(timeLeft)}
                            </span>

                            {/* Subtle warning indicator */}
                            {warningLevel !== "normal" && (
                                <span className={cn(
                                    "w-2 h-2 rounded-full ml-1",
                                    warningLevel === "warning" && "bg-amber-300",
                                    warningLevel === "critical" && "bg-orange-300 animate-pulse",
                                    warningLevel === "final" && "bg-red-300 animate-ping"
                                )} />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MeetingCountdown;

