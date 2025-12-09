"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { EmotionSnapshot } from "@/types/moner-canvus";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Camera, CameraOff, AlertCircle } from "lucide-react";

// Define type for dynamically imported face-api
type FaceApiType = typeof import("face-api.js");

interface FaceTrackerProps {
  sessionStart: number | null;
  isRunning: boolean;
  onEmotionSnapshot: (snapshot: EmotionSnapshot) => void;
}

export default function FaceTracker({
  sessionStart,
  isRunning,
  onEmotionSnapshot,
}: FaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceapiRef = useRef<FaceApiType | null>(null);
  
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load face-api.js models dynamically
  const loadModels = useCallback(async () => {
    if (modelsLoaded && faceapiRef.current) return true;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Dynamic import to avoid Node.js 'fs' module issue
      const faceapi = await import("face-api.js");
      faceapiRef.current = faceapi;
      
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      setError("Failed to load emotion detection models.");
      setIsLoading(false);
      return false;
    }
  }, [modelsLoaded]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    // First load models if not loaded
    const loaded = await loadModels();
    if (!loaded) {
      setIsLoading(false);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to access camera:", err);
      setError("Could not access camera. Please grant permission.");
      setCameraEnabled(false);
      setIsLoading(false);
    }
  }, [loadModels]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Detect emotions every 500ms
  const detectEmotions = useCallback(async () => {
    const faceapi = faceapiRef.current;
    if (!videoRef.current || !faceapi || !modelsLoaded || !sessionStart) return;
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();
      
      if (detection) {
        const expressions = detection.expressions;
        const snapshot: EmotionSnapshot = {
          t: performance.now() - sessionStart,
          emotions: {
            neutral: expressions.neutral,
            happy: expressions.happy,
            sad: expressions.sad,
            angry: expressions.angry,
            fearful: expressions.fearful,
            disgusted: expressions.disgusted,
            surprised: expressions.surprised,
          },
        };
        onEmotionSnapshot(snapshot);
      }
    } catch (err) {
      console.error("Emotion detection error:", err);
    }
  }, [modelsLoaded, sessionStart, onEmotionSnapshot]);

  // Handle camera toggle
  useEffect(() => {
    if (cameraEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [cameraEnabled, startCamera, stopCamera]);

  // Start/stop emotion detection based on session state
  useEffect(() => {
    if (isRunning && cameraEnabled && modelsLoaded) {
      intervalRef.current = setInterval(detectEmotions, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, cameraEnabled, modelsLoaded, detectEmotions]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-card rounded-lg border">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {cameraEnabled ? (
            <Camera className="h-4 w-4 text-primary" />
          ) : (
            <CameraOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="camera-toggle" className="text-sm font-medium">
            Emotion Tracking
          </Label>
        </div>
        <Switch
          id="camera-toggle"
          checked={cameraEnabled}
          onCheckedChange={setCameraEnabled}
          disabled={isLoading}
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        Enable camera to track facial expressions for deeper insights.
      </p>
      
      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-xs">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Video preview */}
      {cameraEnabled && (
        <div className="relative rounded overflow-hidden bg-black aspect-video max-w-[240px]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            style={{ transform: "scaleX(-1)" }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
