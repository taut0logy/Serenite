from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from chatbot_service import ChatbotService
from datetime import datetime

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize chatbot service
chatbot_service = ChatbotService()

class ChatRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, str]]

class ChatResponse(BaseModel):
    response: str

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await chatbot_service.get_response(
            request.message,
            request.chat_history
        )
        return ChatResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversation/summary")
async def get_conversation_summary():
    """Get summary of the current conversation."""
    summary = chatbot_service.get_conversation_summary()
    if not summary:
        raise HTTPException(status_code=404, detail="No conversation history found")
    return summary

@app.get("/user/{user_id}/mood")
async def get_user_mood(user_id: str):
    """Get mood analysis for a specific user."""
    analysis = chatbot_service.get_mood_analysis(user_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="No mood data found for user")
    return analysis

@app.get("/crisis-resources")
async def get_crisis_resources():
    """Get crisis resources and helpline information."""
    return chatbot_service.crisis_resources

@app.get("/health")
async def health_check():
    """Check if the service is healthy."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/")
async def root():
    return {"message": "Chatbot API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
