from fastapi import APIRouter, Depends, Request, HTTPException
from services.breathing_exercise import (
    EmotionalState,
    BreathingPattern,
    generate_breathing_exercise,
)
from utils.logger import logger
from middleware.auth import get_current_user

router = APIRouter(prefix="/breathing", tags=["Breathing Exercises"])
    
    
@router.options("/generate")
async def breathing_options():
    """Handle OPTIONS request for CORS preflight."""
    return {}


@router.post("/generate", response_model=BreathingPattern)
async def breathing_exercise_endpoint(request:Request, state: EmotionalState, user=Depends(get_current_user)):
    """Generate a breathing exercise based on the user's emotional state."""
    try:
        return generate_breathing_exercise(state)
    except Exception as e:
        logger.error(f"Error generating breathing exercise: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error generating breathing exercise: {str(e)}"
        )