from pydantic import BaseModel, Field
from typing import List, Dict
from datetime import datetime

class MentalHealthProfile(BaseModel):
    domain_scores: Dict[str, int] = Field(..., description="Raw aggregated sum per domain")
    normalized_scores: Dict[str, float] = Field(..., description="Raw score ÷ max domain value")
    tags: List[str] = Field(
        ..., 
        description="Typed tag array driving service logic",
        min_items=1,
    )
    narrative_summary: str = Field(..., max_length=500, description="Auto‑generated summary")
    recommendations: List[str] = Field(..., min_items=1, max_items=6, description="Tailored service links or steps")
    timestamp: datetime = Field(..., description="Server‐side UTC timestamp; establishes version.")

    class Config:
        extra = "forbid"
