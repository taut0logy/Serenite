from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime

class MentalHealthProfile(BaseModel):
    domain_scores: Dict[str, int] = Field(..., description="Raw aggregated sum per domain")
    normalized_scores: Dict[str, float] = Field(..., description="Raw score ÷ max domain value")
    tags: List[str] = Field(
        ..., 
        description="Typed tag array driving service logic",
        pattern=r"^(depression_none_minimal|depression_mild|depression_moderate|depression_moderately_severe|depression_severe|anxiety_none_minimal|anxiety_mild|anxiety_moderate|anxiety_severe|ptsd_unlikely|ptsd_probable|ptsd_elevated|social_anxiety_low|social_anxiety_moderate|social_anxiety_high|social_anxiety_very_high|low_self_esteem|normal_self_esteem|high_self_esteem|cog_distort_low|cog_distort_moderate|cog_distort_high|sleep_disturbance_low|sleep_disturbance_moderate|sleep_disturbance_high|function_impairment_low|function_impairment_moderate|function_impairment_high)$",
        min_items=1,
    )
    narrative_summary: str = Field(..., max_length=500, description="Auto‑generated summary")
    recommendations: List[str] = Field(..., min_items=1, max_items=6, description="Tailored service links or steps")
    timestamp: datetime = Field(..., description="Server‐side UTC timestamp; establishes version.")

    class Config:
        extra = "forbid"
