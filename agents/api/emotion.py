
from fastapi import APIRouter, HTTPException, UploadFile, File
import io
import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write
import tempfile
import os
import datetime
from PIL import Image
from services.emotion_detection import (
    detect_face_emotion,
    analyze_voice,
    EMOTION_MENTAL_HEALTH_INSIGHTS,
    VOICE_EMOTION_INSIGHTS,
)
from models.emotion import EmotionJournalEntry, EmotionDetectionResult
from api.emotion_journal import add_to_emotion_journal

router = APIRouter(prefix="/emotion", tags=["Emotion Detection and Analysis"])

@router.post("/detect-face-emotion", response_model=EmotionDetectionResult)
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


@router.post("/analyze-voice", response_model=EmotionDetectionResult)
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


@router.post("/record-voice")
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

@router.get("/insights/{emotion_type}/{emotion}")
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