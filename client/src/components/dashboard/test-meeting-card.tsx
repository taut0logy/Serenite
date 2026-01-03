"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    Play,
    FlaskConical,
    FastForward,
    RotateCcw,
    Loader2,
    Video,
    Timer
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    getOrCreateTestMeeting,
    setTestMeetingTime,
    hastenTestMeeting,
    resetTestMeeting,
    hastenMeetingEnd,
} from "@/actions/meeting.actions";

interface TestMeeting {
    id: string;
    startTime: Date;
    endTime: Date | null;
    status: string;
    groupName: string;
    groupId: string;
}

export function TestMeetingCard() {
    const router = useRouter();
    const [testMeeting, setTestMeeting] = useState<TestMeeting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [timeUntilStart, setTimeUntilStart] = useState<string>("");
    const [timeUntilEnd, setTimeUntilEnd] = useState<string>("");

    // Load or create test meeting
    const loadTestMeeting = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getOrCreateTestMeeting();
            if (result.success && result.meeting) {
                setTestMeeting({
                    ...result.meeting,
                    startTime: new Date(result.meeting.startTime),
                    endTime: result.meeting.endTime ? new Date(result.meeting.endTime) : null,
                });
            }
        } catch (error) {
            console.error("Error loading test meeting:", error);
            toast.error("Failed to load test meeting");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTestMeeting();
    }, [loadTestMeeting]);

    // Update countdown every second
    useEffect(() => {
        if (!testMeeting) return;

        const updateCountdown = () => {
            const now = new Date();
            const start = new Date(testMeeting.startTime);
            const diffMs = start.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeUntilStart("Now");
            } else {
                const minutes = Math.floor(diffMs / 60000);
                const seconds = Math.floor((diffMs % 60000) / 1000);
                setTimeUntilStart(`${minutes}m ${seconds}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [testMeeting]);

    // Update end time countdown
    useEffect(() => {
        if (!testMeeting || !testMeeting.endTime) return;

        const updateEndCountdown = () => {
            const now = new Date();
            const end = new Date(testMeeting.endTime!);
            const diffMs = end.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeUntilEnd("Ended");
            } else {
                const hours = Math.floor(diffMs / 3600000);
                const minutes = Math.floor((diffMs % 3600000) / 60000);
                const seconds = Math.floor((diffMs % 60000) / 1000);
                if (hours > 0) {
                    setTimeUntilEnd(`${hours}h ${minutes}m`);
                } else {
                    setTimeUntilEnd(`${minutes}m ${seconds}s`);
                }
            }
        };

        updateEndCountdown();
        const interval = setInterval(updateEndCountdown, 1000);
        return () => clearInterval(interval);
    }, [testMeeting]);

    // Set start time to 10 minutes from now
    const handleSet10Minutes = async () => {
        if (!testMeeting) return;
        setIsUpdating(true);
        try {
            const result = await setTestMeetingTime(testMeeting.id, 10);
            if (result.success && result.meeting) {
                setTestMeeting((prev) => prev ? {
                    ...prev,
                    startTime: new Date(result.meeting!.startTime),
                    endTime: new Date(result.meeting!.endTime),
                    status: "PENDING",
                } : null);
                toast.success("Meeting set to 10 minutes from now");
            }
        } catch (error) {
            console.error("Error setting meeting time:", error);
            toast.error("Failed to set meeting time");
        } finally {
            setIsUpdating(false);
        }
    };

    // Hasten by 2 minutes
    const handleHasten2Minutes = async () => {
        if (!testMeeting) return;
        setIsUpdating(true);
        try {
            const result = await hastenTestMeeting(testMeeting.id, 2);
            if (result.success && result.meeting) {
                setTestMeeting((prev) => prev ? {
                    ...prev,
                    startTime: new Date(result.meeting!.startTime),
                    endTime: new Date(result.meeting!.endTime),
                } : null);
                toast.success("Meeting hastened by 2 minutes");
            }
        } catch (error) {
            console.error("Error hastening meeting:", error);
            toast.error("Failed to hasten meeting");
        } finally {
            setIsUpdating(false);
        }
    };

    // Hasten end by 5 minutes
    const handleHastenEnd5Minutes = async () => {
        if (!testMeeting) return;
        setIsUpdating(true);
        try {
            const result = await hastenMeetingEnd(testMeeting.id, 5);
            if (result.success && result.meeting) {
                setTestMeeting((prev) => prev ? {
                    ...prev,
                    endTime: new Date(result.meeting!.endTime),
                } : null);
                toast.success("Meeting end hastened by 5 minutes");
            } else if (result.error) {
                toast.error(result.error);
            }
        } catch (error) {
            console.error("Error hastening meeting end:", error);
            toast.error("Failed to hasten meeting end");
        } finally {
            setIsUpdating(false);
        }
    };

    // Reset meeting
    const handleReset = async () => {
        if (!testMeeting) return;
        setIsUpdating(true);
        try {
            await resetTestMeeting(testMeeting.id);
            setTestMeeting(null);
            toast.success("Test meeting reset");
            // Load a fresh test meeting
            await loadTestMeeting();
        } catch (error) {
            console.error("Error resetting meeting:", error);
            toast.error("Failed to reset meeting");
        } finally {
            setIsUpdating(false);
        }
    };

    // Join meeting
    const handleJoinMeeting = () => {
        if (!testMeeting) return;
        router.push(`/meeting/${testMeeting.id}`);
    };

    if (isLoading) {
        return (
            <Card className="border-dashed border-2 border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20">
                <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </CardContent>
            </Card>
        );
    }

    if (!testMeeting) {
        return (
            <Card className="border-dashed border-2 border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20">
                <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">No test meeting available. Join a group first.</p>
                </CardContent>
            </Card>
        );
    }

    const startTime = new Date(testMeeting.startTime);
    const isNow = startTime.getTime() <= Date.now();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <Card className="overflow-hidden border-2 border-violet-300 dark:border-violet-600 bg-gradient-to-br from-violet-100/80 via-purple-50/50 to-fuchsia-100/80 dark:from-violet-950/50 dark:via-purple-950/30 dark:to-fuchsia-950/50 shadow-lg">
                <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-violet-900 dark:text-violet-100">
                                Test Meeting
                            </h2>
                            <p className="text-sm text-violet-600 dark:text-violet-400">
                                {testMeeting.groupName}
                            </p>
                        </div>
                        <Badge
                            variant="outline"
                            className={
                                testMeeting.status === "RUNNING"
                                    ? "bg-green-500/20 text-green-700 border-green-500"
                                    : "bg-violet-500/20 text-violet-700 border-violet-500"
                            }
                        >
                            {testMeeting.status}
                        </Badge>
                    </div>

                    {/* Time Display */}
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 mb-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-violet-500" />
                                <span className="text-sm text-muted-foreground">Starts in:</span>
                            </div>
                            <span className={`text-2xl font-bold font-mono ${isNow ? "text-green-600" : "text-violet-600"}`}>
                                {timeUntilStart}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 text-right">
                            {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                        {testMeeting.endTime && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-violet-200 dark:border-violet-700">
                                <div className="flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-red-500" />
                                    <span className="text-sm text-muted-foreground">Ends in:</span>
                                </div>
                                <span className="text-lg font-bold font-mono text-red-600">
                                    {timeUntilEnd}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Control Buttons */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSet10Minutes}
                            disabled={isUpdating}
                            className="border-violet-300 hover:bg-violet-100 dark:border-violet-600 dark:hover:bg-violet-900/50"
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Clock className="w-4 h-4 mr-1" />
                            )}
                            Set 10min
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleHasten2Minutes}
                            disabled={isUpdating}
                            className="border-orange-300 hover:bg-orange-100 dark:border-orange-600 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400"
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <FastForward className="w-4 h-4 mr-1" />
                            )}
                            -2 min Start
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleHastenEnd5Minutes}
                            disabled={isUpdating || !testMeeting.endTime}
                            className="border-red-300 hover:bg-red-100 dark:border-red-600 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400"
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Timer className="w-4 h-4 mr-1" />
                            )}
                            -5 min End
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={isUpdating}
                            className="border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-900/50 text-slate-600"
                        >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleJoinMeeting}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            {isNow ? (
                                <>
                                    <Play className="w-4 h-4 mr-1" />
                                    Join Now
                                </>
                            ) : (
                                <>
                                    <Video className="w-4 h-4 mr-1" />
                                    Go to Meeting
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 p-3 bg-violet-100/50 dark:bg-violet-900/30 rounded-lg">
                        <p className="text-xs text-violet-700 dark:text-violet-300">
                            <strong>Tips:</strong> Use `&quot;Set 10min&quot;` to schedule meeting 10 minutes from now.
                            Use `&quot;-2 min&quot;` to make meeting start sooner. Waiting room opens 10 minutes before start.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
