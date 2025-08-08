"use client";

import { useState, useEffect } from "react";
import {
    useCallStateHooks,
    useCall,
    DeviceSettings,
} from "@stream-io/video-react-sdk";
import { Settings, Mic, Video, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DeviceInfo {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}

export const DeviceControlsPanel = () => {
    const call = useCall();
    const { useCameraState, useMicrophoneState } = useCallStateHooks();
    const { camera } = useCameraState();
    const { microphone } = useMicrophoneState();

    const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<DeviceInfo[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
    const [selectedOutputDevice, setSelectedOutputDevice] =
        useState<string>("");

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();

                const audioInputs = devices
                    .filter((device) => device.kind === "audioinput")
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label:
                            device.label ||
                            `Microphone ${device.deviceId.slice(0, 8)}`,
                        kind: device.kind,
                    }));

                const videoInputs = devices
                    .filter((device) => device.kind === "videoinput")
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label:
                            device.label ||
                            `Camera ${device.deviceId.slice(0, 8)}`,
                        kind: device.kind,
                    }));

                const audioOutputs = devices
                    .filter((device) => device.kind === "audiooutput")
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label:
                            device.label ||
                            `Speaker ${device.deviceId.slice(0, 8)}`,
                        kind: device.kind,
                    }));

                setAudioDevices(audioInputs);
                setVideoDevices(videoInputs);
                setOutputDevices(audioOutputs);

                // Set defaults
                if (audioInputs.length > 0 && !selectedAudioDevice) {
                    setSelectedAudioDevice(audioInputs[0].deviceId);
                }
                if (videoInputs.length > 0 && !selectedVideoDevice) {
                    setSelectedVideoDevice(videoInputs[0].deviceId);
                }
                if (audioOutputs.length > 0 && !selectedOutputDevice) {
                    setSelectedOutputDevice(audioOutputs[0].deviceId);
                }
            } catch (error) {
                console.error("Error getting devices:", error);
            }
        };

        getDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener("devicechange", getDevices);

        return () => {
            navigator.mediaDevices.removeEventListener(
                "devicechange",
                getDevices
            );
        };
    }, [selectedAudioDevice, selectedVideoDevice, selectedOutputDevice]);

    const handleAudioDeviceChange = async (deviceId: string) => {
        try {
            if (microphone && call) {
                await microphone.select(deviceId);
                setSelectedAudioDevice(deviceId);
            }
        } catch (error) {
            console.error("Error changing audio device:", error);
        }
    };

    const handleVideoDeviceChange = async (deviceId: string) => {
        try {
            if (camera && call) {
                await camera.select(deviceId);
                setSelectedVideoDevice(deviceId);
            }
        } catch (error) {
            console.error("Error changing video device:", error);
        }
    };

    const handleOutputDeviceChange = async (deviceId: string) => {
        try {
            // For audio output device changes
            setSelectedOutputDevice(deviceId);
            // Note: Stream SDK may not directly support changing audio output
            // This would typically require additional WebRTC APIs
        } catch (error) {
            console.error("Error changing output device:", error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="custom-call-control-btn w-10 h-10 rounded-lg border bg-slate-700/50 hover:bg-slate-600 border-slate-600 text-white transition-all duration-200"
                >
                    <Settings size={18} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="bg-slate-800 border-slate-700 text-white min-w-[280px] max-h-[400px] overflow-y-auto"
            >
                <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold">
                    Device Settings
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="border-slate-600" />

                {/* Microphone Selection */}
                <DropdownMenuLabel className="px-3 py-1 text-xs text-slate-400 flex items-center">
                    <Mic size={14} className="mr-2" />
                    Microphone
                </DropdownMenuLabel>
                {audioDevices.map((device) => (
                    <DropdownMenuItem
                        key={device.deviceId}
                        onClick={() => handleAudioDeviceChange(device.deviceId)}
                        className={cn(
                            "hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-4 py-2 text-sm",
                            selectedAudioDevice === device.deviceId &&
                                "bg-slate-700 text-blue-400"
                        )}
                    >
                        {device.label}
                        {selectedAudioDevice === device.deviceId && (
                            <span className="ml-auto text-blue-400">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="border-slate-600" />

                {/* Camera Selection */}
                <DropdownMenuLabel className="px-3 py-1 text-xs text-slate-400 flex items-center">
                    <Video size={14} className="mr-2" />
                    Camera
                </DropdownMenuLabel>
                {videoDevices.map((device) => (
                    <DropdownMenuItem
                        key={device.deviceId}
                        onClick={() => handleVideoDeviceChange(device.deviceId)}
                        className={cn(
                            "hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-4 py-2 text-sm",
                            selectedVideoDevice === device.deviceId &&
                                "bg-slate-700 text-blue-400"
                        )}
                    >
                        {device.label}
                        {selectedVideoDevice === device.deviceId && (
                            <span className="ml-auto text-blue-400">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="border-slate-600" />

                {/* Speaker Selection */}
                <DropdownMenuLabel className="px-3 py-1 text-xs text-slate-400 flex items-center">
                    <Volume2 size={14} className="mr-2" />
                    Speaker
                </DropdownMenuLabel>
                {outputDevices.map((device) => (
                    <DropdownMenuItem
                        key={device.deviceId}
                        onClick={() =>
                            handleOutputDeviceChange(device.deviceId)
                        }
                        className={cn(
                            "hover:bg-slate-700 focus:bg-slate-700 cursor-pointer px-4 py-2 text-sm",
                            selectedOutputDevice === device.deviceId &&
                                "bg-slate-700 text-blue-400"
                        )}
                    >
                        {device.label}
                        {selectedOutputDevice === device.deviceId && (
                            <span className="ml-auto text-blue-400">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="border-slate-600" />

                {/* Stream's Default Device Settings */}
                <div className="px-3 py-2">
                    <div className="text-xs text-slate-400 mb-2">
                        Advanced Settings
                    </div>
                    <DeviceSettings />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
