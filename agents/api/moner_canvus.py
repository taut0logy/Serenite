"""
Moner Canvus - Mental Health Drawing Canvas
FastAPI router for handling drawing session analysis and storage
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Any, List
import logging

from services.moner_canvus_gemini import (
    MonerCanvusPayload,
    AnalysisResponse,
    StoredCanvusSession,
    analyze_with_gemini,
    store_canvus_session,
    get_user_sessions,
    get_session_by_id,
)
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
    Analyze a Moner Canvus drawing session and store it.
    
    Receives the drawing image, stroke data, and emotion snapshots,
    then uses Gemini AI to provide emotional insights.
    """
    try:
        # Get user ID from payload metadata
        user_id = payload.metadata.userId
        
        logger.info(
            f"Analyzing Moner Canvus session: {payload.metadata.sessionId} "
            f"(user: {user_id}, strokes: {len(payload.strokes)}, "
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
        
        # Store the session in database
        stored = store_canvus_session(user_id, payload, result)
        if stored:
            logger.info(f"Session stored with ID: {stored.id}")
        else:
            logger.warning("Session analyzed but not stored (database unavailable)")
        
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


@router.get("/sessions", response_model=List[StoredCanvusSession])
async def list_sessions(
    request: Request,
    user_id: str = "anonymous",
    limit: int = 20,
) -> List[StoredCanvusSession]:
    """
    Get all Moner Canvus sessions for a user.
    
    Returns sessions sorted by creation date, newest first.
    """
    try:
        sessions = get_user_sessions(user_id, limit)
        logger.info(f"Returning {len(sessions)} sessions for user {user_id}")
        return sessions
        
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch sessions: {str(e)}"
        )


@router.get("/sessions/{session_id}", response_model=StoredCanvusSession)
async def get_session(
    request: Request,
    session_id: str,
    user_id: str = "anonymous",
) -> StoredCanvusSession:
    """
    Get a specific Moner Canvus session by ID.
    """
    try:
        session = get_session_by_id(session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return session
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch session: {str(e)}"
        )


@router.get("/health")
async def health_check() -> dict[str, Any]:
    """Health check endpoint for Moner Canvus service."""
    return {
        "status": "healthy",
        "service": "moner-canvus",
    }
