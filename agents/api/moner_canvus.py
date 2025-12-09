"""
Moner Canvus - Mental Health Drawing Canvas
FastAPI router for handling drawing session analysis
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Any
import logging

from services.moner_canvus_gemini import (
    MonerCanvusPayload,
    AnalysisResponse,
    analyze_with_gemini,
)
from middleware.auth import get_current_user
from config.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/moner-canvus",
    tags=["Moner Canvus - Creative Expression Analysis"],
)


@router.post("/sessions", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def create_session(
    request: Request,
    payload: MonerCanvusPayload,
) -> AnalysisResponse:
    """
    Analyze a Moner Canvus drawing session.
    
    Receives the drawing image, stroke data, and emotion snapshots,
    then uses Gemini AI to provide emotional insights.
    """
    try:
        logger.info(
            f"Analyzing Moner Canvus session: {payload.metadata.sessionId} "
            f"(user: {payload.metadata.userId}, strokes: {len(payload.strokes)}, "
            f"emotions: {len(payload.emotions)})"
        )
        
        # Validate that we have an image
        if not payload.finalImageBase64:
            raise HTTPException(
                status_code=400,
                detail="No drawing image provided"
            )
        
        # Analyze with Gemini
        result = await analyze_with_gemini(payload)
        
        logger.info(
            f"Analysis complete for session {payload.metadata.sessionId}: "
            f"tags={result.tags}, highDistress={result.riskFlags.isHighDistress}"
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing Moner Canvus session: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze drawing: {str(e)}"
        )


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Health check endpoint for Moner Canvus service."""
    return {
        "status": "healthy",
        "service": "moner-canvus",
    }
