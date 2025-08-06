from pydantic import BaseModel
from typing import Union, Optional

class Feedback(BaseModel):
    user_id: str
    timestamp: str
    assistant_message: str
    user_message: str
    helpful: bool
    improvement: Optional[str] = None
    message_id: Optional[Union[int, str]] = None

