"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

export type VapiCallStatus = "idle" | "connecting" | "connected" | "ended";

export interface VapiTranscript {
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
}

interface UseVapiOptions {
    publicKey: string;
    onCallStart?: () => void;
    onCallEnd?: () => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onError?: (error: Error) => void;
    onMessage?: (message: VapiTranscript) => void;
}

// Store vapi instance outside of component to prevent recreation
let globalVapiInstance: Vapi | null = null;

export function useVapi({
    publicKey,
    onCallStart,
    onCallEnd,
    onSpeechStart,
    onSpeechEnd,
    onError,
    onMessage,
}: UseVapiOptions) {
    const [status, setStatus] = useState<VapiCallStatus>("idle");
    const [volumeLevel, setVolumeLevel] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    
    // Use refs for callbacks to avoid re-creating the vapi instance
    const callbacksRef = useRef({
        onCallStart,
        onCallEnd,
        onSpeechStart,
        onSpeechEnd,
        onError,
        onMessage,
    });
    
    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = {
            onCallStart,
            onCallEnd,
            onSpeechStart,
            onSpeechEnd,
            onError,
            onMessage,
        };
    }, [onCallStart, onCallEnd, onSpeechStart, onSpeechEnd, onError, onMessage]);

    // Initialize Vapi instance only once
    useEffect(() => {
        if (!publicKey) return;
        
        // Only create instance if it doesn't exist
        if (!globalVapiInstance) {
            globalVapiInstance = new Vapi(publicKey);
        }
        
        const vapi = globalVapiInstance;

        // Set up event listeners
        const handleCallStart = () => {
            setStatus("connected");
            callbacksRef.current.onCallStart?.();
        };

        const handleCallEnd = () => {
            setStatus("ended");
            setVolumeLevel(0);
            setIsSpeaking(false);
            callbacksRef.current.onCallEnd?.();
        };

        const handleSpeechStart = () => {
            setIsSpeaking(true);
            callbacksRef.current.onSpeechStart?.();
        };

        const handleSpeechEnd = () => {
            setIsSpeaking(false);
            callbacksRef.current.onSpeechEnd?.();
        };

        const handleVolumeLevel = (volume: number) => {
            setVolumeLevel(volume);
        };

        const handleMessage = (message: unknown) => {
            const msg = message as { type?: string; role?: string; transcript?: string };
            if (msg.type === "transcript" && msg.role && msg.transcript) {
                const newTranscript: VapiTranscript = {
                    role: msg.role as "user" | "assistant",
                    text: msg.transcript,
                    timestamp: new Date(),
                };
                setTranscripts((prev) => [...prev, newTranscript]);
                callbacksRef.current.onMessage?.(newTranscript);
            }
        };

        const handleError = (error: Error) => {
            console.error("Vapi error:", error);
            setStatus("idle");
            callbacksRef.current.onError?.(error);
        };

        vapi.on("call-start", handleCallStart);
        vapi.on("call-end", handleCallEnd);
        vapi.on("speech-start", handleSpeechStart);
        vapi.on("speech-end", handleSpeechEnd);
        vapi.on("volume-level", handleVolumeLevel);
        vapi.on("message", handleMessage);
        vapi.on("error", handleError);

        return () => {
            // Remove event listeners but don't destroy the instance
            vapi.off("call-start", handleCallStart);
            vapi.off("call-end", handleCallEnd);
            vapi.off("speech-start", handleSpeechStart);
            vapi.off("speech-end", handleSpeechEnd);
            vapi.off("volume-level", handleVolumeLevel);
            vapi.off("message", handleMessage);
            vapi.off("error", handleError);
        };
    }, [publicKey]);

    // Start a call with an inline assistant configuration for mental wellness
    const startCall = useCallback(async () => {
        if (!globalVapiInstance) {
            console.error("Vapi instance not initialized");
            return;
        }

        setStatus("connecting");
        setTranscripts([]);

        try {
            await globalVapiInstance.start({
                model: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: `You are a compassionate and empathetic mental wellness voice assistant named Serenity. Your purpose is to provide emotional support, active listening, and gentle guidance for mental wellbeing.

Key behaviors:
- Speak in a calm, warm, and supportive tone
- Practice active listening and reflect back what the user shares
- Ask open-ended questions to help users explore their feelings
- Offer evidence-based coping strategies when appropriate (breathing exercises, grounding techniques, mindfulness)
- Never diagnose or replace professional mental health care
- Encourage seeking professional help when someone expresses severe distress or mentions self-harm
- Be culturally sensitive and non-judgmental
- Keep responses concise but meaningful for voice conversation

If someone is in crisis, gently suggest they contact a crisis helpline or mental health professional.

Start by warmly greeting the user and asking how they're feeling today.`,
                        },
                    ],
                    temperature: 0.7,
                },
                voice: {
                    provider: "11labs",
                    voiceId: "pFZP5JQG7iQjIQuC4Bku", // Lily - calm female voice
                },
                name: "Serenity - Mental Wellness Assistant",
                firstMessage: "Hello, I'm Serenity, your mental wellness companion. I'm here to listen and support you. How are you feeling today?",
            });
        } catch (error) {
            console.error("Failed to start call:", error);
            setStatus("idle");
            callbacksRef.current.onError?.(error as Error);
        }
    }, []);

    // End the current call - this is the critical fix
    const endCall = useCallback(() => {
        console.log("endCall called, globalVapiInstance:", !!globalVapiInstance);
        
        if (globalVapiInstance) {
            try {
                // Call stop on the global instance
                globalVapiInstance.stop();
                console.log("Called vapi.stop()");
            } catch (error) {
                console.error("Error stopping call:", error);
            }
        }
        
        // Immediately update UI state
        setStatus("ended");
        setVolumeLevel(0);
        setIsSpeaking(false);
        setIsMuted(false);
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (globalVapiInstance) {
            const newMuted = !isMuted;
            globalVapiInstance.setMuted(newMuted);
            setIsMuted(newMuted);
        }
    }, [isMuted]);

    // Reset to idle state - also stops any active call
    const reset = useCallback(() => {
        // Stop any active call first
        if (globalVapiInstance) {
            try {
                globalVapiInstance.stop();
            } catch (error) {
                console.error("Error stopping call during reset:", error);
            }
        }
        
        setStatus("idle");
        setTranscripts([]);
        setVolumeLevel(0);
        setIsMuted(false);
        setIsSpeaking(false);
    }, []);

    return {
        status,
        volumeLevel,
        isMuted,
        isSpeaking,
        transcripts,
        startCall,
        endCall,
        toggleMute,
        reset,
    };
}
