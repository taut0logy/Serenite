from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Body,
    BackgroundTasks,
    Response,
)
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
import requests
from PIL import Image

# Remove googletrans import
# from googletrans import Translator

# Import langchain memory components
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Import from our mental health assistant module
from mental_health_assistant.mental_health_assistant import (
    chat_with_mental_health_assistant,
)
from mental_health_assistant.emotion_detection import (
    detect_face_emotion,
    analyze_voice,
    EMOTION_MENTAL_HEALTH_INSIGHTS,
    VOICE_EMOTION_INSIGHTS,
)

# Import diary functionality
from diary.diary import (
    DiaryEntry,
    StoredDiaryEntry,
    MoodAnalysis,
    analyze_diary_entry,
    store_diary_entry,
    search_diary_entries,
)

# Import breathing exercise functionality
from breathing_exercise.breathing_exercise import (
    EmotionalState,
    BreathingPattern,
    generate_breathing_exercise,
)

app = FastAPI(
    title="Bangladesh Mental Health Support Assistant API",
    description="API endpoints for the mental health support assistant",
    version="1.0.0",
)

# Add CORS middleware to allow cross-origin requests (for NextJS frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Remove translator initialization
# translator = Translator()


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
    user_id: Optional[str] = None  # Added user_id to identify the conversation


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


# New feedback model
class Feedback(BaseModel):
    user_id: str
    timestamp: str
    assistant_message: str
    user_message: str
    helpful: bool
    improvement: Optional[str] = None
    message_id: Optional[Union[int, str]] = None


# Translation request model
class TranslationRequest(BaseModel):
    text: str
    target_language: str = "bn"  # Default to Bengali/Bangla


# Translation response model
class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str


# In-memory storage (replace with database in production)
emotion_journal = []
feedback_data = []  # Store feedback data in memory
chat_histories = {}  # Store chat histories per user


@app.get("/")
async def root():
    return {"message": "Bangladesh Mental Health Support Assistant API"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the mental health assistant.

    If emotion data is included, it will be incorporated into the conversation.
    """
    global chat_histories

    # Check for user ID - required for memory management
    user_id = request.user_id
    if not user_id:
        raise HTTPException(
            status_code=400, detail="User ID is required for chat history"
        )

    # Retrieve or create chat history for this user
    if user_id not in chat_histories:
        chat_histories[user_id] = ChatMessageHistory()

    # Get the chat history
    history = chat_histories[user_id]

    # Initialize agent state if needed
    if request.agent_state is None:
        request.agent_state = {}

    # Check if we should add message history to the agent state
    if "messages" not in request.agent_state:
        # Convert langchain ChatMessageHistory to the format our assistant expects
        converted_messages = []
        for msg in history.messages:
            if isinstance(msg, HumanMessage):
                converted_messages.append({"type": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                converted_messages.append({"type": "ai", "content": msg.content})
            elif isinstance(msg, SystemMessage):
                converted_messages.append({"type": "system", "content": msg.content})

        # Add messages to agent state if there's history
        if converted_messages:
            request.agent_state["message_history"] = converted_messages

    # Add facial emotion data to state if selected
    if request.include_face_emotion and request.face_emotion:
        request.agent_state["facial_emotion"] = {
            "emotion": request.face_emotion.get("emotion", ""),
            "score": request.face_emotion.get("score", 0.0),
        }

    # Add voice emotion data to state if selected
    if request.include_voice_emotion and request.voice_emotion:
        request.agent_state["voice_emotion"] = {
            "emotion": request.voice_emotion.get("emotion", ""),
            "score": request.voice_emotion.get("score", 0.0),
        }

    # Add user message to history
    history.add_user_message(request.message)

    # Pass the original message and updated state to the assistant
    result = chat_with_mental_health_assistant(request.message, request.agent_state)

    # Format response
    formatted_messages = []
    assistant_response = None

    if "messages" in result:
        for msg in result["messages"]:
            if hasattr(msg, "type") and msg.type == "human":
                formatted_messages.append({"role": "user", "content": msg.content})
            elif hasattr(msg, "type") and msg.type == "ai":
                formatted_messages.append({"role": "assistant", "content": msg.content})
                assistant_response = msg.content  # Save the assistant's response
            elif hasattr(msg, "type") and msg.type == "function":
                formatted_messages.append(
                    {"role": "function", "content": msg.content, "name": msg.name}
                )

    # Add assistant response to history if we found one
    if assistant_response:
        history.add_ai_message(assistant_response)

    # Store updated chat history
    chat_histories[user_id] = history

    # Limit memory usage (keep only the most recent 100 users' chat histories)
    if len(chat_histories) > 100:
        oldest_keys = sorted(chat_histories.keys())[:-100]
        for key in oldest_keys:
            chat_histories.pop(key, None)

    return {"messages": formatted_messages, "agent_state": result}


@app.get("/chat/history/{user_id}")
async def get_chat_history(user_id: str):
    """
    Get the chat history for a specific user
    """
    global chat_histories

    if user_id not in chat_histories:
        return {"messages": []}

    history = chat_histories[user_id]
    formatted_messages = []

    for msg in history.messages:
        if isinstance(msg, HumanMessage):
            formatted_messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            formatted_messages.append({"role": "assistant", "content": msg.content})
        elif isinstance(msg, SystemMessage):
            formatted_messages.append({"role": "system", "content": msg.content})

    return {"messages": formatted_messages}


@app.delete("/chat/history/{user_id}")
async def clear_chat_history(user_id: str):
    """
    Clear the chat history for a specific user
    """
    global chat_histories

    if user_id in chat_histories:
        chat_histories[user_id] = ChatMessageHistory()

    return {"status": "success", "message": "Chat history cleared"}


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

    # Add to emotion journal automatically
    try:
        entry = EmotionJournalEntry(
            emotion=emotion,
            score=score,
            note="Automatically detected from facial expression",
            source="face",
            timestamp=datetime.datetime.now(),
        )
        await add_to_emotion_journal(entry)
    except Exception as e:
        print(f"Error adding to emotion journal: {str(e)}")

    return {"emotion": emotion, "score": score, "insights": insights}


@app.post("/analyze-voice", response_model=EmotionDetectionResult)
async def analyze_voice_endpoint(file: UploadFile = File(...)):
    """
    Analyze voice tone from uploaded audio file
    """
    # Save uploaded file to temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
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

        # Add to emotion journal automatically
        try:
            entry = EmotionJournalEntry(
                emotion=emotion,
                score=confidence,
                note="Automatically detected from voice",
                source="voice",
                timestamp=datetime.datetime.now(),
            )
            await add_to_emotion_journal(entry)
        except Exception as e:
            print(f"Error adding to emotion journal: {str(e)}")

        return {"emotion": emotion, "score": confidence, "insights": insights}
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
    temp_file = os.path.join(temp_dir, "voice_analysis_temp.wav")

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

    return {"emotion": emotion, "score": confidence, "insights": insights}


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
        most_common = (
            max(emotion_counts.items(), key=lambda x: x[1])[0]
            if emotion_counts
            else None
        )

        # Analyze time patterns (simplified)
        morning_emotions = []
        afternoon_emotions = []
        evening_emotions = []

        for entry in emotion_journal:
            timestamp = entry["timestamp"]
            hour = (
                timestamp.hour
                if isinstance(timestamp, datetime.datetime)
                else timestamp.get("hour", 0)
            )

            if 5 <= hour <= 11:
                morning_emotions.append(entry["emotion"])
            elif 12 <= hour <= 17:
                afternoon_emotions.append(entry["emotion"])
            elif 18 <= hour <= 23:
                evening_emotions.append(entry["emotion"])

        # Find most common emotions by time of day
        morning_common = (
            max(set(morning_emotions), key=morning_emotions.count)
            if morning_emotions
            else "No data"
        )
        afternoon_common = (
            max(set(afternoon_emotions), key=afternoon_emotions.count)
            if afternoon_emotions
            else "No data"
        )
        evening_common = (
            max(set(evening_emotions), key=evening_emotions.count)
            if evening_emotions
            else "No data"
        )

        patterns = {
            "most_common": most_common,
            "time_patterns": {
                "morning": morning_common,
                "afternoon": afternoon_common,
                "evening": evening_common,
            },
        }

    return {"entries": emotion_journal, "patterns": patterns}


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
            raise HTTPException(
                status_code=404, detail=f"No insights found for face emotion: {emotion}"
            )
    elif emotion_type.lower() == "voice":
        if emotion.lower() in VOICE_EMOTION_INSIGHTS:
            return VOICE_EMOTION_INSIGHTS[emotion.lower()]
        else:
            raise HTTPException(
                status_code=404,
                detail=f"No insights found for voice emotion: {emotion}",
            )
    else:
        raise HTTPException(
            status_code=400, detail="Emotion type must be either 'face' or 'voice'"
        )


@app.get("/resources")
async def get_mental_health_resources():
    """Get mental health resources for Bangladesh"""
    return {
        "crisis_resources": [
            {
                "name": "National Mental Health Helpline (Bangladesh)",
                "contact": "01688-709965, 01688-709966",
                "description": "Government helpline for mental health support",
            },
            {
                "name": "Kaan Pete Roi (Emotional Support)",
                "contact": "9612119911",
                "description": "Emotional support and suicide prevention hotline",
            },
            {
                "name": "Bangladesh Emergency Services",
                "contact": "999",
                "description": "National emergency services",
            },
        ],
        "organizations": [
            {
                "name": "National Institute of Mental Health (NIMH)",
                "website": "https://nimhbd.com/",
                "description": "Leading mental health institution in Bangladesh",
            },
            {
                "name": "Bangladesh Association of Psychiatrists",
                "website": "http://www.bap.org.bd/",
                "description": "Professional association of psychiatrists",
            },
            {
                "name": "Dhaka Community Hospital",
                "website": "http://dchtrust.org/",
                "description": "Hospital providing mental health services",
            },
            {
                "name": "Mental Health & Psychosocial Support Network Bangladesh",
                "website": "https://www.mhinnovation.net/organisations/mental-health-psychosocial-support-network-bangladesh",
                "description": "Network providing psychosocial support",
            },
        ],
    }


@app.post("/feedback")
async def submit_feedback(feedback: Feedback):
    """
    Submit feedback about an assistant's response.

    This allows users to indicate whether a response was helpful and provide
    improvement suggestions if it wasn't.
    """
    global feedback_data

    # Convert to dict for storage
    feedback_dict = feedback.dict()

    # Add to feedback data storage
    feedback_data.append(feedback_dict)

    # Keep the feedback data manageable in memory (limit to last 100 entries)
    if len(feedback_data) > 100:
        feedback_data = feedback_data[-100:]

    return {"status": "success", "message": "Feedback submitted successfully"}


@app.get("/feedback")
async def get_feedback(limit: int = 50):
    """
    Get submitted feedback data (for admin use).

    Args:
        limit: Maximum number of feedback entries to return (defaults to 50)
    """
    global feedback_data

    # Return limited number of most recent feedback entries
    return {"feedback": feedback_data[-limit:] if limit > 0 else feedback_data}


@app.get("/feedback/analytics")
async def get_feedback_analytics():
    """
    Get analytics about the feedback data.

    This endpoint provides insights such as helpful vs unhelpful percentages,
    common improvement suggestions, and trends over time.
    """
    global feedback_data

    if not feedback_data:
        return {
            "message": "No feedback data available",
            "stats": {"total": 0, "helpful_percentage": 0, "unhelpful_percentage": 0},
        }

    # Calculate basic stats
    total = len(feedback_data)
    helpful_count = sum(1 for item in feedback_data if item.get("helpful", False))
    helpful_percentage = (helpful_count / total) * 100
    unhelpful_percentage = 100 - helpful_percentage

    # Extract improvement suggestions for unhelpful responses
    improvement_suggestions = [
        item.get("improvement", "").lower()
        for item in feedback_data
        if not item.get("helpful", True) and item.get("improvement")
    ]

    # Analyze common themes in improvement suggestions (simplified)
    # In a real implementation, you might use NLP techniques for better analysis
    themes = {}
    common_keywords = [
        "unclear",
        "confusing",
        "irrelevant",
        "wrong",
        "unhelpful",
        "incomplete",
        "specific",
        "detail",
        "emotion",
        "empathy",
        "address",
        "listen",
        "understand",
        "context",
        "more",
        "less",
    ]

    for suggestion in improvement_suggestions:
        for keyword in common_keywords:
            if keyword in suggestion:
                if keyword in themes:
                    themes[keyword] += 1
                else:
                    themes[keyword] = 1

    # Sort themes by frequency
    sorted_themes = sorted(themes.items(), key=lambda x: x[1], reverse=True)

    # Time-based analysis
    # Group by day (simplified)
    daily_stats = {}
    for item in feedback_data:
        try:
            date_str = item.get("timestamp", "").split("T")[
                0
            ]  # Extract just the date part
            if date_str:
                if date_str not in daily_stats:
                    daily_stats[date_str] = {"total": 0, "helpful": 0}
                daily_stats[date_str]["total"] += 1
                if item.get("helpful", False):
                    daily_stats[date_str]["helpful"] += 1
        except Exception:
            continue  # Skip items with invalid timestamp format

    # Calculate daily percentages
    for date, stats in daily_stats.items():
        if stats["total"] > 0:
            stats["helpful_percentage"] = (stats["helpful"] / stats["total"]) * 100
        else:
            stats["helpful_percentage"] = 0

    return {
        "stats": {
            "total": total,
            "helpful_count": helpful_count,
            "unhelpful_count": total - helpful_count,
            "helpful_percentage": round(helpful_percentage, 2),
            "unhelpful_percentage": round(unhelpful_percentage, 2),
        },
        "common_improvement_themes": (
            [
                {"theme": theme, "count": count}
                for theme, count in sorted_themes[:10]  # Top 10 themes
            ]
            if sorted_themes
            else []
        ),
        "daily_stats": [
            {"date": date, **stats} for date, stats in sorted(daily_stats.items())
        ],
    }


@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """
    Translate text from one language to another using Google Translate API directly
    """
    try:
        # Use public Google Translate API directly with requests
        # This is more stable and doesn't have dependency conflicts
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={request.target_language}&dt=t&q={requests.utils.quote(request.text)}"

        response = requests.get(url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=500, detail="Translation service unavailable"
            )

        # Parse the response from Google
        result = response.json()

        # Extract translated text from the nested response structure
        translated_text = "".join([sentence[0] for sentence in result[0]])

        # Get detected source language if available
        source_language = result[2] if len(result) > 2 else "auto"

        return TranslationResponse(
            original_text=request.text,
            translated_text=translated_text,
            source_language=source_language,
            target_language=request.target_language,
        )
    except Exception as e:
        # Handle errors
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# Add diary endpoints
@app.options("/diary/analyze")
async def analyze_options():
    """Handle OPTIONS request for CORS preflight."""
    return {}


@app.post("/diary/analyze", response_model=MoodAnalysis)
async def analyze_diary(entry: DiaryEntry):
    """Analyze a diary entry and return mood analysis."""
    try:
        return analyze_diary_entry(entry)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in mood analysis: {str(e)}")


@app.options("/diary/store")
async def store_options():
    """Handle OPTIONS request for CORS preflight."""
    return {}


@app.post("/diary/store", response_model=StoredDiaryEntry)
async def store_diary(entry: DiaryEntry):
    """Store a diary entry in AstraDB with mood analysis."""
    try:
        return store_diary_entry(entry)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error storing diary entry: {str(e)}"
        )


@app.options("/diary/search")
async def search_options():
    """Handle OPTIONS request for CORS preflight."""
    return {}


@app.get("/diary/search", response_model=List[StoredDiaryEntry])
async def search_diary(query: str, user_id: str, limit: int = 5):
    """Search diary entries using semantic search."""
    try:
        return search_diary_entries(query, user_id, limit)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error searching diary entries: {str(e)}"
        )


# Add breathing exercise endpoints
@app.options("/breathing/generate")
async def breathing_options():
    """Handle OPTIONS request for CORS preflight."""
    return {}


@app.post("/breathing/generate", response_model=BreathingPattern)
async def breathing_exercise_endpoint(state: EmotionalState):
    """Generate a breathing exercise based on the user's emotional state."""
    try:
        return generate_breathing_exercise(state)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating breathing exercise: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
