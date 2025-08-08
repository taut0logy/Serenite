"use client";

import { useEffect, useState } from "react";
import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { MicOff, Volume2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const SpeakingIndicator = () => {
    const { useMicrophoneState } = useCallStateHooks();
    const { microphone, isMute: isMicMuted } = useMicrophoneState();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const checkAudioLevel = async () => {
            try {
                if (!microphone) return;

                // Get the audio track from the microphone state
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });
                if (!mediaStream) return;

                const audioTracks = mediaStream.getAudioTracks();
                if (audioTracks.length === 0) return;

                // Create audio context to analyze audio levels
                const audioContext = new AudioContext();
                const source =
                    audioContext.createMediaStreamSource(mediaStream);
                const analyzer = audioContext.createAnalyser();

                analyzer.fftSize = 256;
                source.connect(analyzer);

                const bufferLength = analyzer.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const checkLevel = () => {
                    analyzer.getByteFrequencyData(dataArray);

                    // Calculate average volume level
                    const average =
                        dataArray.reduce((acc, val) => acc + val, 0) /
                        bufferLength;
                    const isCurrentlySpeaking = average > 10; // Threshold for speaking detection

                    setIsSpeaking(isCurrentlySpeaking);

                    // Show warning if speaking while muted
                    if (isCurrentlySpeaking && isMicMuted) {
                        setShowWarning(true);
                        // Clear warning after 3 seconds of not speaking
                        clearTimeout(timeoutId);
                        timeoutId = setTimeout(() => {
                            if (!isSpeaking) {
                                setShowWarning(false);
                            }
                        }, 3000);
                    } else if (!isMicMuted) {
                        setShowWarning(false);
                    }

                    requestAnimationFrame(checkLevel);
                };

                checkLevel();

                return () => {
                    audioContext.close();
                    clearTimeout(timeoutId);
                    mediaStream.getTracks().forEach((track) => track.stop());
                };
            } catch (error) {
                console.error(
                    "Error setting up audio level monitoring:",
                    error
                );
            }
        };

        if (microphone) {
            checkAudioLevel();
        }

        return () => {
            clearTimeout(timeoutId);
        };
    }, [microphone, isMicMuted, isSpeaking]);

    // Hide warning when mic is unmuted
    useEffect(() => {
        if (!isMicMuted) {
            setShowWarning(false);
        }
    }, [isMicMuted]);

    if (!showWarning) return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/80 backdrop-blur-sm animate-pulse">
                <MicOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 ml-2">
                    <div className="flex items-center gap-2">
                        <Volume2
                            size={16}
                            className="text-amber-600 dark:text-amber-400"
                        />
                        <span className="font-medium">
                            You&apos;re speaking while muted
                        </span>
                    </div>
                    <p className="text-sm mt-1">
                        Click the microphone button to unmute yourself
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    );
};
