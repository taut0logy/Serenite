"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Volume2,
    Sparkles,
    Heart,
} from "lucide-react";
import { useVapi, VapiCallStatus, VapiTranscript } from "@/hooks/use-vapi";
import { cn } from "@/lib/utils";

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Animated orb component that responds to volume
function VoiceOrb({
    volumeLevel,
    status,
    isSpeaking,
}: {
    volumeLevel: number;
    status: VapiCallStatus;
    isSpeaking: boolean;
}) {
    const scale = useMemo(() => {
        if (status !== "connected") return 1;
        return 1 + volumeLevel * 0.5;
    }, [volumeLevel, status]);

    const pulseAnimation = status === "connecting" ? {
        scale: [1, 1.1, 1],
        opacity: [0.6, 1, 0.6],
    } : {};

    return (
        <div className="relative flex items-center justify-center">
            {/* Outer glow rings */}
            <motion.div
                className="absolute w-48 h-48 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-xl"
                animate={{
                    scale: status === "connected" ? [1, 1.2, 1] : 1,
                    opacity: status === "connected" ? [0.3, 0.5, 0.3] : 0.2,
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            
            <motion.div
                className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 blur-lg"
                animate={{
                    scale: status === "connected" ? [1.1, 1.3, 1.1] : 1.1,
                    opacity: status === "connected" ? [0.4, 0.6, 0.4] : 0.3,
                }}
                transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2,
                }}
            />

            {/* Main orb */}
            <motion.div
                className={cn(
                    "relative w-32 h-32 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600",
                    "shadow-2xl shadow-purple-500/50"
                )}
                animate={{
                    scale,
                    ...pulseAnimation,
                }}
                transition={{
                    scale: { type: "spring", stiffness: 300, damping: 20 },
                    ...(status === "connecting" ? { duration: 1.5, repeat: Infinity } : {}),
                }}
            >
                {/* Inner shine */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                
                {/* Icon overlay */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10"
                >
                    {status === "idle" ? (
                        <Heart className="w-12 h-12 text-white/90" />
                    ) : status === "connecting" ? (
                        <Sparkles className="w-12 h-12 text-white/90" />
                    ) : (
                        <Volume2 
                            className={cn(
                                "w-12 h-12 text-white/90 transition-opacity",
                                isSpeaking ? "opacity-100" : "opacity-60"
                            )} 
                        />
                    )}
                </motion.div>
            </motion.div>

            {/* Voice activity indicator rings */}
            {status === "connected" && (
                <>
                    <motion.div
                        className="absolute w-36 h-36 rounded-full border-2 border-purple-400/40"
                        animate={{
                            scale: [1, 1.3],
                            opacity: [0.6, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                    />
                    <motion.div
                        className="absolute w-36 h-36 rounded-full border-2 border-fuchsia-400/40"
                        animate={{
                            scale: [1, 1.4],
                            opacity: [0.5, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: 0.3,
                        }}
                    />
                </>
            )}
        </div>
    );
}

// Transcript message component
function TranscriptMessage({ transcript }: { transcript: VapiTranscript }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex gap-3 p-3 rounded-2xl max-w-[85%]",
                transcript.role === "user"
                    ? "ml-auto bg-purple-600/20 border border-purple-500/30"
                    : "mr-auto bg-white/10 border border-white/20"
            )}
        >
            <p className="text-sm text-white/90 leading-relaxed">
                {transcript.text}
            </p>
        </motion.div>
    );
}

export default function VoiceAssistantModal({
    isOpen,
    onClose,
}: VoiceAssistantModalProps) {
    const [showTranscripts, setShowTranscripts] = useState(false);
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

    const {
        status,
        volumeLevel,
        isMuted,
        isSpeaking,
        transcripts,
        startCall,
        endCall,
        toggleMute,
        reset,
    } = useVapi({
        publicKey,
        onCallEnd: () => {
            // Keep modal open to show ended state
        },
    });

    // Reset state when modal closes - always stop call first
    useEffect(() => {
        if (!isOpen) {
            // Ensure call is stopped when modal closes
            endCall();
            setShowTranscripts(false);
            // Reset to idle after a short delay
            const timer = setTimeout(() => {
                reset();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, endCall, reset]);

    const handleClose = () => {
        // Always call endCall first to stop any active call
        endCall();
        // Small delay to ensure call is stopped before closing modal
        setTimeout(() => {
            onClose();
        }, 50);
    };

    const getStatusText = () => {
        switch (status) {
            case "idle":
                return "Ready to connect";
            case "connecting":
                return "Connecting to Serenity...";
            case "connected":
                return isSpeaking ? "Serenity is speaking..." : "Listening...";
            case "ended":
                return "Call ended";
            default:
                return "";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent 
                className={cn(
                    "max-w-md w-full p-0 gap-0 border-0 overflow-hidden",
                    "bg-gradient-to-br from-slate-900 via-purple-900/90 to-slate-900",
                    "shadow-2xl shadow-purple-900/50"
                )}
            >
                <DialogTitle className="sr-only">Voice Assistant</DialogTitle>
                
                {/* Decorative background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-600/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-fuchsia-600/20 blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-600/10 blur-3xl" />
                </div>

                <div className="relative flex flex-col items-center p-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            Serenity
                            <Sparkles className="w-5 h-5 text-purple-400" />
                        </h2>
                        <p className="text-sm text-white/60">
                            Your Mental Wellness Companion
                        </p>
                    </motion.div>

                    {/* Voice Orb */}
                    <div className="mb-8">
                        <VoiceOrb
                            volumeLevel={volumeLevel}
                            status={status}
                            isSpeaking={isSpeaking}
                        />
                    </div>

                    {/* Status Text */}
                    <motion.p
                        key={getStatusText()}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-white/70 mb-6 h-5"
                    >
                        {getStatusText()}
                    </motion.p>

                    {/* Transcripts Area */}
                    <AnimatePresence>
                        {showTranscripts && transcripts.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="w-full mb-6"
                            >
                                <ScrollArea className="h-40 w-full rounded-xl bg-black/20 border border-white/10 p-3">
                                    <div className="flex flex-col gap-2">
                                        {transcripts.map((transcript, index) => (
                                            <TranscriptMessage
                                                key={index}
                                                transcript={transcript}
                                            />
                                        ))}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-4">
                        {status === "idle" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Button
                                    onClick={startCall}
                                    size="lg"
                                    className={cn(
                                        "rounded-full px-8 py-6 text-base font-medium",
                                        "bg-gradient-to-r from-violet-600 to-fuchsia-600",
                                        "hover:from-violet-500 hover:to-fuchsia-500",
                                        "shadow-lg shadow-purple-500/30",
                                        "transition-all duration-300"
                                    )}
                                >
                                    <Phone className="w-5 h-5 mr-2" />
                                    Start Conversation
                                </Button>
                            </motion.div>
                        )}

                        {status === "connecting" && (
                            <div className="flex gap-3">
                                <Button
                                    disabled
                                    size="lg"
                                    className="rounded-full px-8 py-6 text-base bg-white/10 text-white/70"
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="mr-2"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                    </motion.div>
                                    Connecting...
                                </Button>
                                <Button
                                    onClick={endCall}
                                    size="icon"
                                    variant="ghost"
                                    className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40"
                                >
                                    <PhoneOff className="w-5 h-5 text-red-400" />
                                </Button>
                            </div>
                        )}

                        {status === "connected" && (
                            <>
                                <Button
                                    onClick={toggleMute}
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                        "w-14 h-14 rounded-full",
                                        "bg-white/10 hover:bg-white/20",
                                        "border border-white/20",
                                        isMuted && "bg-red-500/20 border-red-500/40"
                                    )}
                                >
                                    {isMuted ? (
                                        <MicOff className="w-6 h-6 text-red-400" />
                                    ) : (
                                        <Mic className="w-6 h-6 text-white" />
                                    )}
                                </Button>

                                <Button
                                    onClick={endCall}
                                    size="icon"
                                    className={cn(
                                        "w-16 h-16 rounded-full",
                                        "bg-gradient-to-r from-red-500 to-rose-600",
                                        "hover:from-red-400 hover:to-rose-500",
                                        "shadow-lg shadow-red-500/30"
                                    )}
                                >
                                    <PhoneOff className="w-7 h-7 text-white" />
                                </Button>

                                <Button
                                    onClick={() => setShowTranscripts(!showTranscripts)}
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                        "w-14 h-14 rounded-full",
                                        "bg-white/10 hover:bg-white/20",
                                        "border border-white/20",
                                        showTranscripts && "bg-purple-500/20 border-purple-500/40"
                                    )}
                                >
                                    <Volume2 className="w-6 h-6 text-white" />
                                </Button>
                            </>
                        )}

                        {status === "ended" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex gap-4"
                            >
                                <Button
                                    onClick={reset}
                                    size="lg"
                                    variant="ghost"
                                    className="rounded-full px-6 py-6 text-base bg-white/10 hover:bg-white/20 text-white border border-white/20"
                                >
                                    <Phone className="w-5 h-5 mr-2" />
                                    Call Again
                                </Button>
                                <Button
                                    onClick={handleClose}
                                    size="lg"
                                    className="rounded-full px-6 py-6 text-base bg-white/20 hover:bg-white/30 text-white"
                                >
                                    Close
                                </Button>
                            </motion.div>
                        )}
                    </div>

                    {/* Help text */}
                    {status === "idle" && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-6 text-xs text-white/40 text-center max-w-xs"
                        >
                            Talk openly about how you&apos;re feeling. Serenity is here to listen and support you.
                        </motion.p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
