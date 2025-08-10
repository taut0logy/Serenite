from fastapi import APIRouter, Depends, Request,  HTTPException
from pydantic import BaseModel, Field
from typing import Dict
from middleware.auth import get_current_user
from utils.logger import logger
from config.limiter import limiter
from services.mental_profiling import generate_profile
from models.mental_health_profile import MentalHealthProfile


DOMAIN_MAP = {
    "dep1": "depression", "dep2": "depression", "dep3": "depression",
    "dep4": "depression", "dep5": "depression", "dep6": "depression",
    "dep7": "depression",
    "anx1": "anxiety", "anx2": "anxiety", "anx3": "anxiety", "anx4": "anxiety",
    "anx5": "anxiety", "anx6": "anxiety", "anx7": "anxiety",
    "trauma1": "ptsd","trauma2": "ptsd","trauma3": "ptsd","trauma4": "ptsd",
    "trauma5": "ptsd","trauma6": "ptsd","trauma7": "ptsd",
    "social1": "social_anxiety", "social2": "social_anxiety","social3": "social_anxiety",
    "social4": "social_anxiety","social5": "social_anxiety","social6": "social_anxiety",
    "social7": "social_anxiety",
    "cog1": "cognitive_distortion","cog2": "cognitive_distortion","cog3": "cognitive_distortion",
    "cog4": "cognitive_distortion","cog5": "cognitive_distortion","cog6": "cognitive_distortion",
    "cog7": "cognitive_distortion",
    "self1": "self_esteem","self2": "self_esteem","self3": "self_esteem","self4": "self_esteem",
    "self5": "self_esteem","self6": "self_esteem","self7": "self_esteem",
    "func1": "functional_impairment","func2": "functional_impairment",
    "func3": "functional_impairment","func4": "functional_impairment",
    "func5": "sleep_disruption","func6": "sleep_disruption",
    "func7": "sleep_disruption","func8": "sleep_disruption",
}

class IntakeRequest(BaseModel):
    answers: Dict[str, int] = Field(
        ..., description="Mapping question id → Likert value 0–3"
    )

router = APIRouter(prefix="/mental-profile", tags=["Mental Health profiling"])

@router.post("/", response_model=MentalHealthProfile)
@limiter.limit("5/minute")
async def intake(request: Request, input: IntakeRequest, user=Depends(get_current_user)):
    # Sum per-domain
    domain_scores: Dict[str, int] = {}
    for qid, score in input.answers.items():
        if qid not in DOMAIN_MAP:
            raise HTTPException(status_code=400, detail=f"Unknown question id: {qid}")
        domain_scores.setdefault(DOMAIN_MAP[qid], 0)
        domain_scores[DOMAIN_MAP[qid]] += score

    response = await generate_profile(domain_scores)

    if not response:
        logger.error("Failed to generate mental health profile")
        raise HTTPException(status_code=500, detail="Failed to generate mental health profile")
    return response
