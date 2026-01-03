"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { StreamCall, StreamTheme } from "@stream-io/video-react-sdk";
import MeetingSetup from "@/components/meeting/meeting-setup";
import MeetingRoom from "@/components/meeting/meeting-room";
import WaitingRoom from "@/components/meeting/waiting-room";
import MeetingCountdown from "@/components/meeting/meeting-countdown";
import { useGetCallById } from "@/hooks/useGetCallById";
import Loader from "@/components/meeting/loader";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import {
    canJoinMeeting,
    startMeeting,
    endMeeting,
    joinMeetingAsParticipant,
    type MeetingDetails,
    type JoinCheckResult,
} from "@/actions/meeting.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function MeetingPage() {
    const params = useParams();
    const id = params?.id as string;

    return (
        <Suspense fallback={<Loader />}>
            <MeetingPageContent id={id as string} />
        </Suspense>
    );
}

const MeetingPageContent = ({ id }: { id: string }) => {
    const router = useRouter();
    const { isLoading, user } = useAuth();
    const { call, isCallLoading } = useGetCallById(id);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Meeting access state
    const [joinCheck, setJoinCheck] = useState<JoinCheckResult | null>(null);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);
    const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
    const [showWaitingRoom, setShowWaitingRoom] = useState(false);
    const [meetingEnded, setMeetingEnded] = useState(false);

    // Check if user can join meeting
    const checkMeetingAccess = useCallback(async () => {
        if (!id) return;

        setIsCheckingAccess(true);
        try {
            const result = await canJoinMeeting(id);

            if (!result.success) {
                setError(result.error || "Failed to check meeting access");
                return;
            }

            setJoinCheck(result.result || null);

            if (result.result?.canJoin) {
                setMeetingDetails(result.result.meeting || null);
                setShowWaitingRoom(result.result.waitingRoom);

                // If meeting is starting (not waiting room), mark as running and join as participant
                if (!result.result.waitingRoom && result.result.meeting?.status === "PENDING") {
                    await startMeeting(id);
                }

                // Join as participant
                await joinMeetingAsParticipant(id);
            } else {
                // Handle various rejection reasons
                switch (result.result?.reason) {
                    case "too_early":
                        break; // Will show time until can join
                    case "too_late":
                    case "meeting_ended":
                        setMeetingEnded(true);
                        break;
                    case "not_member":
                        setError("You are not a member of this support group");
                        break;
                }
            }
        } catch (err) {
            console.error("Error checking meeting access:", err);
            setError("Failed to check meeting access");
        } finally {
            setIsCheckingAccess(false);
        }
    }, [id]);

    useEffect(() => {
        if (user && id) {
            checkMeetingAccess();
        }
    }, [user, id, checkMeetingAccess]);

    // Handle waiting room transition to meeting
    const handleMeetingStart = useCallback(async () => {
        setShowWaitingRoom(false);
        // Start the meeting in the database
        if (id) {
            await startMeeting(id);
        }
    }, [id]);

    // Handle meeting end
    const handleMeetingEnd = useCallback(async () => {
        setMeetingEnded(true);
        if (id) {
            await endMeeting(id);
        }
    }, [id]);

    // Error handling for GetStream call
    useEffect(() => {
        if (!isCallLoading && !call && joinCheck?.canJoin) {
            setError(
                "Meeting not found or you don't have access to this meeting"
            );
        }
    }, [call, isCallLoading, joinCheck]);

    // Loading state
    if (isLoading || isCheckingAccess) return <Loader />;

    // Not authenticated
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Please sign in to join the meeting
                        </p>
                        <Button onClick={() => router.push("/login")}>
                            Sign In
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Meeting has ended
    if (meetingEnded) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 to-slate-800">
                <Card className="max-w-md border-0 bg-slate-800/50">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-blue-600/20 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                            Meeting Has Ended
                        </h2>
                        <p className="text-slate-400">
                            Thank you for participating. The meeting has concluded.
                        </p>
                        <Button
                            onClick={() => router.push("/dashboard")}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Too early to join
    if (joinCheck && !joinCheck.canJoin && joinCheck.reason === "too_early") {
        const waitTime = joinCheck.meetingStartsIn || 0;
        const minutes = Math.ceil(waitTime / 60000);

        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 to-slate-800">
                <Card className="max-w-md border-0 bg-slate-800/50">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-amber-600/20 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                            Meeting Not Yet Open
                        </h2>
                        <p className="text-slate-400">
                            The waiting room opens {minutes} minute{minutes !== 1 ? "s" : ""} before the meeting starts.
                        </p>
                        <p className="text-sm text-slate-500">
                            Please come back closer to the scheduled time.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/dashboard")}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Dashboard
                            </Button>
                            <Button
                                onClick={checkMeetingAccess}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Check Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (error || !joinCheck?.canJoin) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <Card className="max-w-md border-0 bg-slate-800/50">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
                        <p className="text-lg text-white">
                            {error || joinCheck?.reason || "Cannot join meeting"}
                        </p>
                        <p className="text-sm text-slate-400">
                            Please check your meeting link and try again
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/dashboard")}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                Dashboard
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Waiting room
    if (showWaitingRoom && meetingDetails) {
        return (
            <WaitingRoom
                meeting={meetingDetails}
                meetingStartsIn={joinCheck.meetingStartsIn || 0}
                onMeetingStart={handleMeetingStart}
            />
        );
    }

    // Loading GetStream call
    if (isCallLoading) return <Loader />;

    // GetStream call not found
    if (!call) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-900 to-slate-800">
                <Card className="max-w-md border-0 bg-slate-800/50">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
                        <p className="text-lg text-white">
                            Setting up meeting room...
                        </p>
                        <Loader />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main meeting UI
    return (
        <main className="w-full overflow-hidden relative">
            {/* Countdown timer overlay */}
            {meetingDetails && (
                <MeetingCountdown
                    meetingId={id}
                    endTime={meetingDetails.endTime}
                    onMeetingEnd={handleMeetingEnd}
                />
            )}

            <StreamCall call={call}>
                <StreamTheme className="h-full">
                    {!isSetupComplete ? (
                        <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
                    ) : (
                        <MeetingRoom id={id} />
                    )}
                </StreamTheme>
            </StreamCall>
        </main>
    );
};

