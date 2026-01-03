"use client";

import React, { useState, useEffect } from "react";
import { Clock, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface StoredSession {
  id: string;
  user_id: string;
  session_id: string;
  image_data: string;
  emotional_summary: string;
  drawing_summary: string;
  suggestions: string[];
  tags: string[];
  high_distress: boolean;
  stroke_count: number;
  color_count: number;
  duration_seconds: number;
  created_at: string;
}

interface SessionHistoryProps {
  userId: string;
  onSelectSession?: (session: StoredSession) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SessionHistory({ userId, onSelectSession }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch sessions on mount
  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch(`${API_BASE_URL}/moner-canvus/sessions?user_id=${encodeURIComponent(userId)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchSessions();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  if (loading) {
    return (
      <div className="p-4 bg-card rounded-lg border animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-3" />
        <div className="space-y-2">
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>No previous sessions yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Past Sessions</span>
          <span className="text-xs text-muted-foreground">({sessions.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Sessions List */}
      {expanded && (
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setSelectedId(session.id);
                  onSelectSession?.(session);
                }}
                className={`w-full flex gap-3 p-2 rounded-lg text-left transition-colors ${
                  selectedId === session.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                }`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                  {session.image_data ? (
                    <Image
                      width={48}
                      height={48}
                      src={session.image_data}
                      alt="Drawing"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(session.created_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(session.duration_seconds)}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2 mt-0.5">
                    {session.emotional_summary.slice(0, 80)}...
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {session.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
