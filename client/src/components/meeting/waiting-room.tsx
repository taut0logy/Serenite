"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    Users,
    Calendar,
    Coffee,
    MessageCircle,
    Sparkles
} from "lucide-react";
import type { MeetingDetails } from "@/actions/meeting.actions";

interface WaitingRoomProps {
    meeting: MeetingDetails;
    meetingStartsIn: number; // milliseconds
    onMeetingStart: () => void;
}

export function WaitingRoom({ meeting, meetingStartsIn, onMeetingStart }: WaitingRoomProps) {
    const [timeLeft, setTimeLeft] = useState(meetingStartsIn);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Format time remaining as mm:ss or hh:mm:ss
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

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 1000;
                if (newTime <= 0) {
                    clearInterval(interval);
                    setIsTransitioning(true);
                    // Small delay for transition animation
                    setTimeout(() => {
                        onMeetingStart();
                    }, 1500);
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [onMeetingStart]);

    // Format meeting time
    const meetingTime = new Date(meeting.startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const meetingDate = new Date(meeting.startTime).toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
    });

    return (
        <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg"
            >
                <Card className="border-0 shadow-2xl bg-slate-800/50 backdrop-blur-xl">
                    <CardContent className="p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2 }}
                                className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center"
                            >
                                <Coffee className="w-10 h-10 text-white" />
                            </motion.div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Waiting Room
                            </h1>
                            <p className="text-slate-400">
                                The meeting will start soon
                            </p>
                        </div>

                        {/* Meeting Info */}
                        <div className="bg-slate-700/50 rounded-xl p-4 mb-6 space-y-3">
                            <div className="flex items-center gap-3 text-white">
                                <Sparkles className="w-5 h-5 text-violet-400" />
                                <span className="font-medium">{meeting.groupName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Calendar className="w-5 h-5 text-blue-400" />
                                <span>{meetingDate}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Clock className="w-5 h-5 text-green-400" />
                                <span>Starts at {meetingTime}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Users className="w-5 h-5 text-orange-400" />
                                <span>{meeting.participantCount} participant(s) waiting</span>
                            </div>
                        </div>

                        {/* Countdown */}
                        <div className="text-center mb-6">
                            {isTransitioning ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-4"
                                >
                                    <div className="w-16 h-16 mx-auto border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-green-400 font-semibold">
                                        Meeting is starting...
                                    </p>
                                </motion.div>
                            ) : (
                                <>
                                    <p className="text-slate-400 text-sm mb-2">
                                        Meeting starts in
                                    </p>
                                    <motion.div
                                        key={timeLeft}
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                        className="text-5xl font-bold text-white font-mono"
                                    >
                                        {formatTime(timeLeft)}
                                    </motion.div>
                                    {timeLeft <= 60000 && timeLeft > 0 && (
                                        <Badge className="mt-3 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                            Less than a minute!
                                        </Badge>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Tips while waiting */}
                        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
                            <p className="text-sm text-slate-400 mb-3 font-medium">
                                While you wait:
                            </p>
                            <ul className="text-sm text-slate-300 space-y-2">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    Check your camera and microphone settings
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                    Find a quiet, comfortable space
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    Have water nearby
                                </li>
                            </ul>
                        </div>

                        {/* Chat hint */}
                        <div className="text-center">
                            <Button variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Chat is available once meeting starts
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

export default WaitingRoom;
