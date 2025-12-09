/**
 * Moner Canvus - Mental Health Drawing Canvas
 * Data contracts shared between frontend and backend
 */

// Tool types for drawing
export type DrawingTool = "pen" | "eraser";

// Point in a stroke with timing
export interface StrokePoint {
  x: number;
  y: number;
  t: number; // milliseconds from session start
}

// A single stroke event
export interface StrokeEvent {
  id: string;
  tool: DrawingTool;
  color: string;
  width: number;
  points: StrokePoint[];
  createdAt: number; // ms from session start
}

// An erase event (for tracking eraser actions)
export interface EraseEvent {
  id: string;
  targetStrokeId?: string;
  area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: number; // ms from session start
}

// Emotion values from face-api.js
export interface EmotionValues {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

// Emotion snapshot at a point in time
export interface EmotionSnapshot {
  t: number; // ms from session start
  emotions: EmotionValues;
}

// Session metadata
export interface SessionMetadata {
  userId: string;
  sessionId: string;
  startedAt: string; // ISO datetime
  endedAt: string; // ISO datetime
  durationMs: number;
  usedCamera: boolean;
  clientVersion: string;
}

// Full payload sent to backend
export interface MonerCanvusPayload {
  metadata: SessionMetadata;
  strokes: StrokeEvent[];
  erases: EraseEvent[];
  emotions: EmotionSnapshot[];
  finalImageBase64: string; // data URL: data:image/png;base64,...
}

// Risk flags in analysis response
export interface RiskFlags {
  isHighDistress: boolean;
  notes: string;
}

// Analysis metrics
export interface AnalysisMetrics {
  strokeCount: number;
  colorCount: number;
  avgSpeed: number;
  sessionDurationMs: number;
  emotionSnapshotCount: number;
}

// Response from backend after analysis
export interface AnalysisResponse {
  sessionId: string;
  emotionalSummary: string;
  drawingSummary: string;
  suggestions: string[];
  tags: string[];
  riskFlags: RiskFlags;
  metrics: AnalysisMetrics;
}
