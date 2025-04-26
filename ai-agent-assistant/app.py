from fastapi import FastAPI, UploadFile, File, HTTPException, Body, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Union, Any
import uvicorn
import base64
import io
import cv2
import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write
import tempfile
import os
import datetime
import librosa
import json
from PIL import Image

# Import from our mental health assistant module
from mental_health_assistant.mental_health_assistant import chat_with_mental_health_assistant
from mental_health_assistant.emotion_detection import (
    detect_face_emotion, 
    analyze_voice,
    EMOTION_MENTAL_HEALTH_INSIGHTS,
    VOICE_EMOTION_INSIGHTS
)

app = FastAPI(
    title="Bangladesh Mental Health Support Assistant API",
    description="API endpoints for the mental health support assistant",
    version="1.0.0"
)

# Add CORS middleware to allow cross-origin requests (for NextJS frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
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

class ChatResponse(BaseModel):
    messages: List[Dict[str, Any]]
    agent_state: Dict[str, Any]

class EmotionDetectionResult(BaseModel):
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

# In-memory storage (replace with database in production)
emotion_journal = []

@app.get("/")
async def root():
    return {"message": "Bangladesh Mental Health Support Assistant API"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the mental health assistant.
    
    If emotion data is included, it will be incorporated into the conversation.
    """
    # Build context with emotions if included
    context = request.message
    emotions_added = []
    
    # Add facial emotion if selected
    if request.include_face_emotion and request.face_emotion:
        emotion = request.face_emotion.get("emotion")
        emotions_added.append(f"facial expression: {emotion}")
    
    # Add voice emotion if selected
    if request.include_voice_emotion and request.voice_emotion:
        emotion = request.voice_emotion.get("emotion")
        emotions_added.append(f"voice tone: {emotion}")
    
    # Add emotions to context if any were selected
    if emotions_added:
        context = f"{request.message} [Detected {', '.join(emotions_added)}]"
    
    # Get response from assistant
    result = chat_with_mental_health_assistant(context, request.agent_state)
    
    # Format response
    formatted_messages = []
    if "messages" in result:
        for msg in result["messages"]:
            if hasattr(msg, 'type') and msg.type == 'human':
                formatted_messages.append({"role": "user", "content": msg.content})
            elif hasattr(msg, 'type') and msg.type == 'ai':
                formatted_messages.append({"role": "assistant", "content": msg.content})
            elif hasattr(msg, 'type') and msg.type == 'function':
                formatted_messages.append({"role": "function", "content": msg.content, "name": msg.name})
    
    return {
        "messages": formatted_messages,
        "agent_state": result
    }

@app.post("/detect-face-emotion", response_model=EmotionDetectionResult)
async def detect_emotion(file: UploadFile = File(...)):
    """
    Analyze facial emotion from uploaded image
    """
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    # Convert PIL Image to numpy array for detection
    img_array = np.array(image)
    
    # Detect emotion
    emotion, score = detect_face_emotion(img_array)
    
    if not emotion:
        raise HTTPException(status_code=400, detail="No face or emotion detected")
    
    # Get insights for this emotion
    insights = {}
    if emotion.lower() in EMOTION_MENTAL_HEALTH_INSIGHTS:
        insights = EMOTION_MENTAL_HEALTH_INSIGHTS[emotion.lower()]
    
    return {
        "emotion": emotion,
        "score": score,
        "insights": insights
    }

@app.post("/analyze-voice", response_model=EmotionDetectionResult)
async def analyze_voice_endpoint(file: UploadFile = File(...)):
    """
    Analyze voice tone from uploaded audio file
    """
    # Save uploaded file to temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    temp_file_path = temp_file.name
    
    try:
        # Write content to temporary file
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Analyze the voice
        emotion, confidence = analyze_voice(temp_file_path)
        
        # Get insights for this emotion
        insights = {}
        if emotion.lower() in VOICE_EMOTION_INSIGHTS:
            insights = VOICE_EMOTION_INSIGHTS[emotion.lower()]
        
        return {
            "emotion": emotion,
            "score": confidence,
            "insights": insights
        }
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

@app.post("/record-voice")
async def record_voice_endpoint(duration: int = 5, sample_rate: int = 22050):
    """
    Record voice directly on the server (for testing purposes)
    In production, voice should be recorded on client and uploaded
    """
    # Create a temporary file
    temp_dir = tempfile.gettempdir()
    temp_file = os.path.join(temp_dir, 'voice_analysis_temp.wav')
    
    # Recording logic
    recording = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
    sd.wait()
    
    # Save the recording
    write(temp_file, sample_rate, recording)
    
    # Analyze the voice
    emotion, confidence = analyze_voice(temp_file)
    
    # Get insights for this emotion
    insights = {}
    if emotion.lower() in VOICE_EMOTION_INSIGHTS:
        insights = VOICE_EMOTION_INSIGHTS[emotion.lower()]
    
    return {
        "emotion": emotion,
        "score": confidence,
        "insights": insights
    }

@app.post("/emotion-journal/add", response_model=EmotionJournalEntry)
async def add_to_emotion_journal(entry: EmotionJournalEntry):
    """
    Add an entry to the emotion journal
    """
    # Declare global at the beginning of the function
    global emotion_journal
    
    # Set timestamp if not provided
    if not entry.timestamp:
        entry.timestamp = datetime.datetime.now()
    
    # Convert to dict for storage
    entry_dict = entry.dict()
    
    # Add to journal
    emotion_journal.append(entry_dict)
    
    # Keep only the last 30 entries
    if len(emotion_journal) > 30:
        emotion_journal = emotion_journal[-30:]
    
    return entry_dict

@app.get("/emotion-journal", response_model=EmotionJournalResponse)
async def get_emotion_journal():
    """
    Get the emotion journal with optional pattern analysis
    """
    # Declare global at the beginning of the function
    global emotion_journal
    
    # If we have enough data, analyze patterns
    patterns = None
    if len(emotion_journal) >= 5:
        # Count occurrences of each emotion
        emotion_counts = {}
        for entry in emotion_journal:
            emotion = entry["emotion"].lower()
            if emotion in emotion_counts:
                emotion_counts[emotion] += 1
            else:
                emotion_counts[emotion] = 1
        
        # Find most common emotion
        most_common = max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else None
        
        # Analyze time patterns (simplified)
        morning_emotions = []
        afternoon_emotions = []
        evening_emotions = []
        
        for entry in emotion_journal:
            timestamp = entry["timestamp"]
            hour = timestamp.hour if isinstance(timestamp, datetime.datetime) else timestamp.get("hour", 0)
            
            if 5 <= hour <= 11:
                morning_emotions.append(entry["emotion"])
            elif 12 <= hour <= 17:
                afternoon_emotions.append(entry["emotion"])
            elif 18 <= hour <= 23:
                evening_emotions.append(entry["emotion"])
        
        # Find most common emotions by time of day
        morning_common = max(set(morning_emotions), key=morning_emotions.count) if morning_emotions else "No data"
        afternoon_common = max(set(afternoon_emotions), key=afternoon_emotions.count) if afternoon_emotions else "No data"
        evening_common = max(set(evening_emotions), key=evening_emotions.count) if evening_emotions else "No data"
        
        patterns = {
            "most_common": most_common,
            "time_patterns": {
                "morning": morning_common,
                "afternoon": afternoon_common,
                "evening": evening_common
            }
        }
    
    return {
        "entries": emotion_journal,
        "patterns": patterns
    }

@app.get("/emotion-insights/{emotion_type}/{emotion}")
async def get_emotion_insights(emotion_type: str, emotion: str):
    """
    Get detailed insights for a specific emotion
    
    Args:
        emotion_type: Either 'face' or 'voice'
        emotion: The emotion to get insights for
    """
    if emotion_type.lower() == "face":
        if emotion.lower() in EMOTION_MENTAL_HEALTH_INSIGHTS:
            return EMOTION_MENTAL_HEALTH_INSIGHTS[emotion.lower()]
        else:
            raise HTTPException(status_code=404, detail=f"No insights found for face emotion: {emotion}")
    elif emotion_type.lower() == "voice":
        if emotion.lower() in VOICE_EMOTION_INSIGHTS:
            return VOICE_EMOTION_INSIGHTS[emotion.lower()]
        else:
            raise HTTPException(status_code=404, detail=f"No insights found for voice emotion: {emotion}")
    else:
        raise HTTPException(status_code=400, detail="Emotion type must be either 'face' or 'voice'")

@app.get("/resources")
async def get_mental_health_resources():
    """Get mental health resources for Bangladesh"""
    return {
        "crisis_resources": [
            {
                "name": "National Mental Health Helpline (Bangladesh)",
                "contact": "01688-709965, 01688-709966",
                "description": "Government helpline for mental health support"
            },
            {
                "name": "Kaan Pete Roi (Emotional Support)",
                "contact": "9612119911",
                "description": "Emotional support and suicide prevention hotline"
            },
            {
                "name": "Bangladesh Emergency Services",
                "contact": "999",
                "description": "National emergency services"
            }
        ],
        "organizations": [
            {
                "name": "National Institute of Mental Health (NIMH)",
                "website": "https://nimhbd.com/",
                "description": "Leading mental health institution in Bangladesh"
            },
            {
                "name": "Bangladesh Association of Psychiatrists",
                "website": "http://www.bap.org.bd/",
                "description": "Professional association of psychiatrists"
            },
            {
                "name": "Dhaka Community Hospital",
                "website": "http://dchtrust.org/",
                "description": "Hospital providing mental health services"
            },
            {
                "name": "Mental Health & Psychosocial Support Network Bangladesh",
                "website": "https://www.mhinnovation.net/organisations/mental-health-psychosocial-support-network-bangladesh",
                "description": "Network providing psychosocial support"
            }
        ]
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 