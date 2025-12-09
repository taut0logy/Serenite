"use client";

import React from "react";
import { AnalysisResponse } from "@/types/moner-canvus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  BookOpen,
  Wind,
  AlertTriangle,
  Sparkles,
  Palette,
  Lightbulb,
  Tags,
} from "lucide-react";
import Link from "next/link";

interface AnalysisPanelProps {
  analysis: AnalysisResponse;
  onNewDrawing: () => void;
}

export default function AnalysisPanel({
  analysis,
  onNewDrawing,
}: AnalysisPanelProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Your Creative Insights</h2>
        </div>
        <p className="text-muted-foreground">
          Here's what we noticed about your drawing session
        </p>
      </div>

      {/* High Distress Warning */}
      {analysis.riskFlags.isHighDistress && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              We noticed some heavy feelings
            </p>
            <p className="text-sm text-muted-foreground">
              Your drawing might reflect some difficult emotions. This is not a
              diagnosis, but consider reaching out to someone you trust or a
              mental health professional if you're struggling.
            </p>
            {analysis.riskFlags.notes && (
              <p className="text-xs text-muted-foreground mt-2">
                {analysis.riskFlags.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Emotional Summary */}
      <div className="p-4 bg-card rounded-lg border space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <h3 className="font-semibold">Emotional Reflection</h3>
        </div>
        <p className="text-sm leading-relaxed">{analysis.emotionalSummary}</p>
      </div>

      {/* Drawing Summary */}
      <div className="p-4 bg-card rounded-lg border space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <Palette className="h-4 w-4" />
          <h3 className="font-semibold">About Your Drawing</h3>
        </div>
        <p className="text-sm leading-relaxed">{analysis.drawingSummary}</p>
      </div>

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="p-4 bg-card rounded-lg border space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="h-4 w-4" />
            <h3 className="font-semibold">Suggestions for You</h3>
          </div>
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {analysis.tags.length > 0 && (
        <div className="p-4 bg-card rounded-lg border space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Tags className="h-4 w-4" />
            <h3 className="font-semibold">Themes Detected</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={onNewDrawing} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Start New Drawing
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/diary">
            <BookOpen className="h-4 w-4" />
            Open Diary
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/breathing-exercise">
            <Wind className="h-4 w-4" />
            Breathing Exercise
          </Link>
        </Button>
      </div>

      {/* Session Metrics */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>
          Session ID: {analysis.sessionId} • Duration:{" "}
          {Math.round(analysis.metrics.sessionDurationMs / 1000)}s • Strokes:{" "}
          {analysis.metrics.strokeCount} • Colors: {analysis.metrics.colorCount}
        </p>
      </div>
    </div>
  );
}
