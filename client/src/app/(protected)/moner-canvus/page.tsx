"use client";

import React, { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import CanvasPane, { CanvasPaneRef } from "@/components/moner-canvus/CanvasPane";
import FaceTracker from "@/components/moner-canvus/FaceTracker";
import AnalysisPanel from "@/components/moner-canvus/AnalysisPanel";
import SessionHistory from "@/components/moner-canvus/SessionHistory";
import {
  StrokeEvent,
  EraseEvent,
  EmotionSnapshot,
  MonerCanvusPayload,
  AnalysisResponse,
} from "@/types/moner-canvus";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MonerCanvusPage() {
  const { user } = useAuth();
  const canvasRef = useRef<CanvasPaneRef>(null);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Data collection refs (using refs to avoid re-renders during drawing)
  const strokesRef = useRef<StrokeEvent[]>([]);
  const erasesRef = useRef<EraseEvent[]>([]);
  const emotionsRef = useRef<EmotionSnapshot[]>([]);

  // Analysis result
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  // Start a new drawing session
  const startSession = useCallback(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setSessionStart(performance.now());
    setIsRunning(true);
    setAnalysis(null);

    // Clear previous data
    strokesRef.current = [];
    erasesRef.current = [];
    emotionsRef.current = [];

    // Clear canvas
    canvasRef.current?.clearCanvas();

    toast.success("Session started! Express yourself freely on the canvas.");
  }, []);

  // Finish session and submit for analysis
  const finishSession = useCallback(async () => {
    if (!sessionStart || !sessionId) return;

    const endTime = performance.now();
    const durationMs = endTime - sessionStart;

    setIsRunning(false);
    setIsLoading(true);

    try {
      // Export canvas image
      const finalImageBase64 = canvasRef.current?.exportImage() || "";

      // Build payload
      const payload: MonerCanvusPayload = {
        metadata: {
          userId: user?.id || "anonymous",
          sessionId,
          startedAt: new Date(Date.now() - durationMs).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs,
          usedCamera: emotionsRef.current.length > 0,
          clientVersion: "1.0.0",
        },
        strokes: strokesRef.current,
        erases: erasesRef.current,
        emotions: emotionsRef.current,
        finalImageBase64,
      };

      // Send to backend
      const response = await fetch(`${API_BASE_URL}/moner-canvus/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Analysis failed");
      }

      const result: AnalysisResponse = await response.json();
      setAnalysis(result);
      toast.success("Your creative insights are ready!");
    } catch (error) {
      console.error("Failed to submit session:", error);
      toast.error("Could not complete analysis. Please try again.");
      
      // Reset to allow retrying
      setIsRunning(true);
    } finally {
      setIsLoading(false);
    }
  }, [sessionStart, sessionId, user?.id]);

  // Handle new stroke
  const handleStrokeComplete = useCallback((stroke: StrokeEvent) => {
    strokesRef.current.push(stroke);
  }, []);

  // Handle erase
  const handleEraseComplete = useCallback((erase: EraseEvent) => {
    erasesRef.current.push(erase);
  }, []);

  // Handle emotion snapshot
  const handleEmotionSnapshot = useCallback((snapshot: EmotionSnapshot) => {
    emotionsRef.current.push(snapshot);
  }, []);

  // Start new drawing (reset everything)
  const handleNewDrawing = useCallback(() => {
    setSessionId(null);
    setSessionStart(null);
    setIsRunning(false);
    setAnalysis(null);
    strokesRef.current = [];
    erasesRef.current = [];
    emotionsRef.current = [];
    canvasRef.current?.clearCanvas();
  }, []);

  // Show analysis if available
  if (analysis) {
    return (
      <div className="container mx-auto py-8 px-4">
        <AnalysisPanel analysis={analysis} onNewDrawing={handleNewDrawing} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Moner Canvus</h1>
          </div>
          <p className="text-muted-foreground">
            Express your feelings through drawing. Our AI will help you understand your emotions.
          </p>
        </div>

        {/* Session Controls */}
        <div className="flex items-center gap-3">
          {!isRunning && !sessionStart && (
            <Button onClick={startSession} size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          )}

          {isRunning && (
            <Button
              onClick={finishSession}
              size="lg"
              variant="secondary"
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {isLoading ? "Analyzing..." : "Finish"}
            </Button>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span>Generating insights...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas - Takes most of the space */}
        <div className="lg:col-span-3">
          <CanvasPane
            ref={canvasRef}
            sessionStart={sessionStart}
            isRunning={isRunning}
            onStrokeComplete={handleStrokeComplete}
            onEraseComplete={handleEraseComplete}
          />
        </div>

        {/* Sidebar - Camera and Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Face Tracker */}
          <FaceTracker
            sessionStart={sessionStart}
            isRunning={isRunning}
            onEmotionSnapshot={handleEmotionSnapshot}
          />

          {/* Session Info */}
          {isRunning && (
            <div className="p-4 bg-card rounded-lg border space-y-2">
              <h3 className="font-medium text-sm">Session Stats</h3>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Strokes: {strokesRef.current.length}</p>
                <p>Emotions captured: {emotionsRef.current.length}</p>
              </div>
            </div>
          )}

          {/* Past Sessions */}
          {!isRunning && (
            <SessionHistory 
              userId={user?.id || "anonymous"} 
              onSelectSession={(session) => {
                // Convert stored session to AnalysisResponse format
                setAnalysis({
                  sessionId: session.session_id,
                  emotionalSummary: session.emotional_summary,
                  drawingSummary: session.drawing_summary,
                  suggestions: session.suggestions,
                  tags: session.tags,
                  riskFlags: { isHighDistress: session.high_distress, notes: "" },
                  metrics: {
                    strokeCount: session.stroke_count,
                    colorCount: session.color_count,
                    avgSpeed: 0,
                    sessionDurationMs: session.duration_seconds * 1000,
                    emotionSnapshotCount: 0,
                  },
                });
              }}
            />
          )}

          {/* Tips */}
          <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 space-y-2">
            <h3 className="font-medium text-sm text-primary">Tips</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Draw freely without judgment</li>
              <li>• Colors can express different moods</li>
              <li>• Enable camera for deeper insights</li>
              <li>• Take your time - there's no rush</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
