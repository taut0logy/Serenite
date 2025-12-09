"""
Moner Canvus - Mental Health Drawing Canvas
Gemini API integration for emotional analysis of drawings

This module contains:
- Pydantic models for data validation
- Gemini API client for image analysis
- Summary statistics computation
"""

import os
import json
import base64
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models
# ============================================================================

# Tool types - using string for Pydantic compatibility
ToolType = str  # "pen" | "eraser"


class StrokePoint(BaseModel):
    """A point in a stroke with timing data."""
    x: float
    y: float
    t: float  # milliseconds from session start


class StrokeEvent(BaseModel):
    """A single stroke event."""
    id: str
    tool: str  # "pen" or "eraser"
    color: str
    width: float
    points: List[StrokePoint]
    createdAt: float  # ms from session start


class EraseArea(BaseModel):
    """Area that was erased."""
    x: float
    y: float
    width: float
    height: float


class EraseEvent(BaseModel):
    """An erase event."""
    id: str
    targetStrokeId: Optional[str] = None
    area: Optional[EraseArea] = None
    createdAt: float  # ms from session start


class EmotionValues(BaseModel):
    """Emotion values from face-api.js."""
    neutral: float = 0.0
    happy: float = 0.0
    sad: float = 0.0
    angry: float = 0.0
    fearful: float = 0.0
    disgusted: float = 0.0
    surprised: float = 0.0


class EmotionSnapshot(BaseModel):
    """Emotion snapshot at a point in time."""
    t: float  # ms from session start
    emotions: EmotionValues


class SessionMetadata(BaseModel):
    """Session metadata."""
    userId: str
    sessionId: str
    startedAt: str  # ISO datetime
    endedAt: str  # ISO datetime
    durationMs: float
    usedCamera: bool
    clientVersion: str


class MonerCanvusPayload(BaseModel):
    """Full payload sent to backend for analysis."""
    metadata: SessionMetadata
    strokes: List[StrokeEvent] = []
    erases: List[EraseEvent] = []
    emotions: List[EmotionSnapshot] = []
    finalImageBase64: str  # data URL: data:image/png;base64,...


class RiskFlags(BaseModel):
    """Risk assessment flags."""
    isHighDistress: bool = False
    notes: str = ""


class AnalysisMetrics(BaseModel):
    """Session metrics included in analysis response."""
    strokeCount: int = 0
    colorCount: int = 0
    avgSpeed: float = 0.0
    sessionDurationMs: float = 0.0
    emotionSnapshotCount: int = 0


class AnalysisResponse(BaseModel):
    """Response from AI analysis."""
    sessionId: str
    emotionalSummary: str
    drawingSummary: str
    suggestions: List[str] = []
    tags: List[str] = []
    riskFlags: RiskFlags = Field(default_factory=RiskFlags)
    metrics: AnalysisMetrics = Field(default_factory=AnalysisMetrics)


# ============================================================================
# Gemini Client
# ============================================================================

def decode_image_from_base64(data_url: str) -> bytes:
    """Decode base64 image from data URL format."""
    # Remove data URL prefix if present
    if data_url.startswith("data:"):
        # Format: data:image/png;base64,<base64_data>
        header, base64_data = data_url.split(",", 1)
    else:
        base64_data = data_url
    
    return base64.b64decode(base64_data)


def compute_summary_statistics(payload: MonerCanvusPayload) -> Dict[str, Any]:
    """Compute summary statistics from the drawing session."""
    strokes = payload.strokes
    emotions = payload.emotions
    
    # Count strokes and colors
    total_strokes = len(strokes)
    pen_strokes = [s for s in strokes if s.tool == "pen"]
    eraser_strokes = [s for s in strokes if s.tool == "eraser"]
    
    # Get unique colors used
    colors_used = list(set(s.color for s in pen_strokes))
    color_count = len(colors_used)
    
    # Calculate average drawing speed (points per second)
    total_points = sum(len(s.points) for s in strokes)
    duration_seconds = payload.metadata.durationMs / 1000.0
    avg_speed = total_points / duration_seconds if duration_seconds > 0 else 0
    
    # Emotion analysis
    emotion_averages = {}
    if emotions:
        emotion_names = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]
        for name in emotion_names:
            values = [getattr(e.emotions, name) for e in emotions]
            emotion_averages[name] = sum(values) / len(values) if values else 0.0
        
        # Find dominant emotion
        dominant_emotion = max(emotion_averages, key=emotion_averages.get) if emotion_averages else "unknown"
    else:
        emotion_averages = {}
        dominant_emotion = "not tracked"
    
    return {
        "durationMs": payload.metadata.durationMs,
        "durationSeconds": duration_seconds,
        "totalStrokes": total_strokes,
        "penStrokes": len(pen_strokes),
        "eraserStrokes": len(eraser_strokes),
        "colorCount": color_count,
        "colorsUsed": colors_used[:10],  # Limit to 10 colors for prompt
        "totalPoints": total_points,
        "avgSpeedPointsPerSec": round(avg_speed, 2),
        "emotionAverages": {k: round(v, 3) for k, v in emotion_averages.items()},
        "dominantEmotion": dominant_emotion,
        "emotionSnapshotCount": len(emotions),
        "usedCamera": payload.metadata.usedCamera,
    }


def build_analysis_prompt(summary_metadata: Dict[str, Any]) -> str:
    """Build the analysis prompt for Gemini."""
    metadata_json = json.dumps(summary_metadata, indent=2)
    
    return f"""You are an assistant that analyzes a user's emotional state based on a drawing and some behavioral metadata.
The user is drawing in a mental-wellbeing app called "Moner Canvus". You receive:
1) The final drawing as an image.
2) A JSON blob with summarized metadata about how they drew it (stroke count, erasing, pace, and facial expression trends).

Your goals:
- Gently reflect possible emotional themes in the drawing, without making absolute clinical claims.
- Describe visual elements and emotional impressions (calm vs tense, expressive vs constrained, etc.).
- Incorporate the metadata (e.g., many erases, slow pace, tense emotions) into your reasoning.
- Always be validating, non-judgmental, and reminder that this is not a diagnosis.

You MUST respond as a single JSON object with this exact schema:

{{
  "emotionalSummary": string,
  "drawingSummary": string,
  "suggestions": string[],
  "tags": string[],
  "riskFlags": {{
    "isHighDistress": boolean,
    "notes": string
  }}
}}

- "emotionalSummary": A 2–4 sentence reflection on the feelings that might be present, based on image + metadata.
- "drawingSummary": A 2–4 sentence description of what you see in the drawing and how it was created.
- "suggestions": 2–5 small, gentle next steps (like journaling, breathing, reflecting).
- "tags": 3–8 short tags like ["calm", "sadness", "self-reflection"].
- "riskFlags": use "isHighDistress = true" only if the content clearly suggests strong distress (dark themes, intense chaos, etc.), and explain why in "notes".

Here is the JSON metadata about how the drawing was made:
{metadata_json}

Now analyze the drawing image and respond with only the JSON object, no additional text."""


async def analyze_with_gemini(payload: MonerCanvusPayload) -> AnalysisResponse:
    """
    Analyze the drawing using Google Gemini API.
    
    Args:
        payload: The full drawing session payload
        
    Returns:
        AnalysisResponse with AI-generated insights
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.error("google-genai package not installed. Install with: pip install google-genai")
        return _create_fallback_response(payload, "AI analysis unavailable - package not installed")
    
    # Get API key from environment
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY environment variable not set")
        return _create_fallback_response(payload, "AI analysis unavailable - API key not configured")
    
    try:
        # Initialize client
        client = genai.Client(api_key=api_key)
        
        # Decode image
        image_bytes = decode_image_from_base64(payload.finalImageBase64)
        
        # Compute summary statistics
        summary_metadata = compute_summary_statistics(payload)
        
        # Build prompt
        prompt = build_analysis_prompt(summary_metadata)
        
        # Create the request with image and text
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                        types.Part.from_text(text=prompt),
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse the response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
        
        result = json.loads(response_text)
        
        # Build the response
        return AnalysisResponse(
            sessionId=payload.metadata.sessionId,
            emotionalSummary=result.get("emotionalSummary", ""),
            drawingSummary=result.get("drawingSummary", ""),
            suggestions=result.get("suggestions", []),
            tags=result.get("tags", []),
            riskFlags=RiskFlags(
                isHighDistress=result.get("riskFlags", {}).get("isHighDistress", False),
                notes=result.get("riskFlags", {}).get("notes", "")
            ),
            metrics=AnalysisMetrics(
                strokeCount=summary_metadata["totalStrokes"],
                colorCount=summary_metadata["colorCount"],
                avgSpeed=summary_metadata["avgSpeedPointsPerSec"],
                sessionDurationMs=summary_metadata["durationMs"],
                emotionSnapshotCount=summary_metadata["emotionSnapshotCount"],
            )
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return _create_fallback_response(payload, "Could not parse AI response")
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _create_fallback_response(payload, f"AI analysis error: {str(e)}")


def _create_fallback_response(payload: MonerCanvusPayload, error_message: str) -> AnalysisResponse:
    """Create a fallback response when analysis fails."""
    summary = compute_summary_statistics(payload)
    
    return AnalysisResponse(
        sessionId=payload.metadata.sessionId,
        emotionalSummary=f"We couldn't fully analyze your drawing at this time. {error_message}. However, taking time to express yourself creatively is always valuable.",
        drawingSummary=f"You created a drawing with {summary['totalStrokes']} strokes using {summary['colorCount']} different colors over {summary['durationSeconds']:.1f} seconds.",
        suggestions=[
            "Try drawing again when you have a moment",
            "Consider journaling about what you were feeling",
            "Take a few deep breaths to center yourself",
        ],
        tags=["creative-expression", "self-care"],
        riskFlags=RiskFlags(isHighDistress=False, notes=""),
        metrics=AnalysisMetrics(
            strokeCount=summary["totalStrokes"],
            colorCount=summary["colorCount"],
            avgSpeed=summary["avgSpeedPointsPerSec"],
            sessionDurationMs=summary["durationMs"],
            emotionSnapshotCount=summary["emotionSnapshotCount"],
        )
    )
