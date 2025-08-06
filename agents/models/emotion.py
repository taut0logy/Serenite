from pydantic import BaseModel
from typing import Dict, Optional, Any, List
import datetime

class EmotionDetectionResult(BaseModel):
    emotion: str
    score: float
    insights: Dict[str, Any]
    emotion: str
    score: float
    insights: Dict[str, Any]
    

class EmotionJournalEntry(BaseModel):
    emotion: str
    score: float
    note: Optional[str] = None
    source: str  # 'face' or 'voice'
    timestamp: Optional[datetime.datetime] = None
    
class EmotionJournalResponse(BaseModel):
    entries: List[Dict[str, Any]]
    patterns: Optional[Dict[str, Any]] = None