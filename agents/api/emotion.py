from fastapi import APIRouter, HTTPException, UploadFile, File
import io
import numpy as np

# Conditionally import sounddevice (not needed in production with API models)
try:
    import sounddevice as sd
    SOUNDDEVICE_AVAILABLE = True
except (ImportError, OSError):
    SOUNDDEVICE_AVAILABLE = False
    sd = None

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

    # Ensure image is in RGB mode (some images might be grayscale, RGBA, etc.)
    if image.mode != "RGB":
        print(f"Converting image from {image.mode} to RGB")
        image = image.convert("RGB")

    # Convert PIL Image to numpy array for detection
    img_array = np.array(image)

    # Detect emotion
    emotion, score = detect_face_emotion(img_array)

    if not emotion:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "No face detected",
                "message": "Please ensure your face is clearly visible in the image and try again.",
                "suggestions": [
                    "Make sure there is adequate lighting",
                    "Position your face in the center of the frame",
                    "Remove any obstructions (glasses, masks, etc.) if possible",
                    "Try capturing the image from a different angle",
                ],
            },
        )

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

    # Important: Close the temp file handle immediately to avoid permission issues on Windows
    temp_file.close()

    try:
        # Write content to temporary file
        file_contents = await file.read()
        with open(temp_file_path, "wb") as buffer:
            buffer.write(file_contents)

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
    except Exception as e:
        print(f"Error analyzing voice: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to analyze voice: {str(e)}"
        )
    finally:
        # Clean up temporary file with better error handling
        try:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        except PermissionError:
            # On Windows, sometimes the file is still locked, try a few times
            import time

            for i in range(3):
                try:
                    time.sleep(0.1)  # Brief delay
                    os.unlink(temp_file_path)
                    break
                except PermissionError:
                    if i == 2:  # Last attempt
                        print(
                            f"Warning: Could not delete temporary file {temp_file_path}"
                        )
        except Exception as cleanup_error:
            print(f"Warning: Error during cleanup: {str(cleanup_error)}")


@router.post("/record-voice")
async def record_voice_endpoint(duration: int = 5, sample_rate: int = 22050):
    """
    Record voice directly on the server (for testing purposes)
    In production, voice should be recorded on client and uploaded
    """
    if not SOUNDDEVICE_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Voice recording not available on this server. Please use the upload endpoint instead."
        )
    
    # Create a temporary file
    temp_dir = tempfile.gettempdir()
    temp_file = os.path.join(
        temp_dir, f"voice_analysis_temp_{datetime.datetime.now().timestamp()}.wav"
    )

    try:
        # Recording logic
        recording = sd.rec(
            int(duration * sample_rate), samplerate=sample_rate, channels=1
        )
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
    except Exception as e:
        print(f"Error with voice recording: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to record and analyze voice: {str(e)}"
        )
    finally:
        # Clean up temporary file
        try:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
        except PermissionError:
            # On Windows, sometimes the file is still locked, try a few times
            import time

            for i in range(3):
                try:
                    time.sleep(0.1)  # Brief delay
                    os.unlink(temp_file)
                    break
                except PermissionError:
                    if i == 2:  # Last attempt
                        print(f"Warning: Could not delete temporary file {temp_file}")
        except Exception as cleanup_error:
            print(f"Warning: Error during cleanup: {str(cleanup_error)}")


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
