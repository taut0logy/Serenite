"use client";

import { useEffect, useState } from "react";
import {
    DeviceSettings,
    VideoPreview,
    useCall,
    useCallStateHooks,
} from "@stream-io/video-react-sdk";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";

const MeetingSetup = ({
    setIsSetupComplete,
}: {
    setIsSetupComplete: (value: boolean) => void;
}) => {
    const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
    const callStartsAt = useCallStartsAt();
    const callEndedAt = useCallEndedAt();
    const callTimeNotArrived =
        callStartsAt && new Date(callStartsAt) > new Date();
    const callHasEnded = !!callEndedAt;

    const call = useCall();

    if (!call) {
        throw new Error(
            "useStreamCall must be used within a StreamCall component."
        );
    }

    const [isMicCamToggled, setIsMicCamToggled] = useState(false);

    useEffect(() => {
        if (isMicCamToggled) {
            call.camera.disable();
            call.microphone.disable();
        } else {
            call.camera.enable();
            call.microphone.enable();
        }
    }, [isMicCamToggled, call.camera, call.microphone]);

    if (callTimeNotArrived)
        return (
            <div className="flex items-center justify-center bg-gradient-to-brp-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 max-w-md mx-auto">
                    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200 ml-2">
                            <div className="space-y-2">
                                <p className="font-semibold">
                                    Meeting hasn&apos;t started yet
                                </p>
                                <p className="text-sm">
                                    Scheduled for{" "}
                                    {callStartsAt.toLocaleString()}
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );

    if (callHasEnded)
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 max-w-md mx-auto">
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-200 ml-2">
                            <div className="space-y-2">
                                <p className="font-semibold">
                                    Meeting has ended
                                </p>
                                <p className="text-sm">
                                    The call has been ended by the host
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );

    return (
        <div className="flex w-full flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto space-y-4">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Join Session
                    </h1>
                </div>

                {/* Video Preview Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="aspect-video relative bg-slate-900 rounded-t-2xl">
                        <VideoPreview className="w-full h-full object-cover mx-auto" />
                    </div>

                    {/* Controls Section */}
                    <div className="p-6 space-y-3">
                        {/* Device Settings Row */}
                        <div className="flex gap-4 items-center justify-center">
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="mic-cam"
                                    checked={isMicCamToggled}
                                    onCheckedChange={(checked) =>
                                        setIsMicCamToggled(checked as boolean)
                                    }
                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <Label
                                    htmlFor="mic-cam"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    Join with mic and camera off
                                </Label>
                            </div>

                            <div className="w-full sm:w-auto *:flex-1">
                                <DeviceSettings />
                            </div>
                        </div>

                        {/* Join Button */}
                        <Button
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                            onClick={async () => {
                                try {
                                    console.log("Attempting to join call...");
                                    await call.join();
                                    console.log("Successfully joined call");
                                    setIsSetupComplete(true);
                                } catch (error) {
                                    console.error(
                                        "Failed to join call:",
                                        error
                                    );
                                    // The error will be handled by the MeetingRoom component's state management
                                }
                            }}
                        >
                            <CheckCircle className="w-5 h-5 mr-3" />
                            Join
                        </Button>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                    <p>
                        Make sure your camera and microphone are working
                        properly
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MeetingSetup;
