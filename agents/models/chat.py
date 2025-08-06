from pydantic import BaseModel
from typing import Dict, List, Optional, Any

class ChatMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    agent_state: Optional[Dict[str, Any]] = None
    include_face_emotion: bool = False
    face_emotion: Optional[Dict[str, Any]] = None
    include_voice_emotion: bool = False
    voice_emotion: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None  # Added user_id to identify the conversation


class ChatResponse(BaseModel):
    messages: List[Dict[str, Any]]
    agent_state: Dict[str, Any]
    
class TranslationRequest(BaseModel):
    text: str
    target_language: str = "bn"  # Default to Bengali/Bangla


# Translation response model
class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str