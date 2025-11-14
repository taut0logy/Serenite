import numpy as np
import librosa
import os
import tempfile
import random
from config.settings import settings
from utils.logger import logger

# Import AWS Rekognition adapter for face emotion detection
try:
    from services.aws_rekognition_adapter import rekognition

    USE_REKOGNITION = rekognition is not None and settings.USE_API_MODELS
except ImportError:
    USE_REKOGNITION = False
    logger.warning(
        "AWS Rekognition adapter not available, face emotion detection disabled"
    )

# Import AWS Voice Sentiment adapter for voice emotion detection
try:
    from services.aws_voice_sentiment_adapter import voice_sentiment

    USE_VOICE_SENTIMENT = (
        voice_sentiment is not None
        and voice_sentiment.enabled
        and settings.USE_API_MODELS
    )
except ImportError:
    USE_VOICE_SENTIMENT = False
    logger.warning("AWS Voice Sentiment adapter not available, using fallback")

# Fallback to DeepFace if AWS Rekognition not configured
if not USE_REKOGNITION:
    try:
        from deepface import DeepFace

        logger.info("Using DeepFace for face emotion detection (fallback)")
    except ImportError:
        logger.warning("DeepFace not available, face emotion detection disabled")

# Mental health insights for different emotions in Bangladesh context
EMOTION_MENTAL_HEALTH_INSIGHTS = {
    "happy": {
        "description": "Happiness can be a sign of good mental wellbeing, but sometimes it may mask underlying issues.",
        "connection": "In Bangladesh, expressing happiness openly is culturally encouraged in many situations, but it's also important to acknowledge all emotions.",
        "recommendations": [
            "Take time to appreciate positive moments",
            "Consider writing down what's making you happy to revisit during challenging times",
            "Check if your happiness feels genuine or if you're suppressing other feelings",
        ],
        "local_resources": "Community gatherings and family events can be good support systems to maintain positive emotions.",
    },
    "sad": {
        "description": "Sadness is a natural emotion and can indicate grief, loss, or depression if persistent.",
        "connection": "In Bangladesh, sadness may sometimes be internalized due to cultural expectations of emotional resilience, especially in rural areas.",
        "recommendations": [
            "Allow yourself to experience sadness without judgment",
            "Consider speaking with a trusted elder or family member",
            "Engage in community or religious activities that provide comfort",
            "If sadness persists for more than two weeks, consider speaking with a mental health professional",
        ],
        "local_resources": "Kaan Pete Roi's emotional support line provides confidential support in Bangla.",
    },
    "angry": {
        "description": "Anger can be a response to perceived injustice, frustration, or unmet needs.",
        "connection": "In Bangladeshi culture, managing anger appropriately is highly valued, but suppressed anger can lead to mental health challenges.",
        "recommendations": [
            "Practice deep breathing for 5 minutes",
            "Write down what triggered your anger",
            "Consider cultural practices like taking a short walk or reciting calming prayers",
            "Find a private space to express frustration safely",
        ],
        "local_resources": "Local community mediators (such as village elders) can sometimes help resolve interpersonal conflicts.",
    },
    "fear": {
        "description": "Fear is a protective emotion but can develop into anxiety disorders if persistent.",
        "connection": "In Bangladesh, fears related to natural disasters, economic insecurity, or social judgment are common stressors.",
        "recommendations": [
            "Practice grounding techniques using the 5-4-3-2-1 method",
            "Talk about your fears with someone you trust",
            "Consider how realistic your fears are and what evidence supports or contradicts them",
            "Gradually face minor fears in a controlled way",
        ],
        "local_resources": "The National Institute of Mental Health (NIMH) in Bangladesh provides services for anxiety disorders.",
    },
    "surprise": {
        "description": "Surprise indicates something unexpected and can trigger stress responses if startling.",
        "connection": "In fast-changing Bangladeshi urban environments, constant surprises can sometimes contribute to adjustment stress.",
        "recommendations": [
            "Take a moment to process unexpected information",
            "Consider if the surprise has triggered any other emotions",
            "Practice adaptability through mindful acceptance",
        ],
        "local_resources": "Community support groups can help those adjusting to major life changes.",
    },
    "neutral": {
        "description": "Neutral expressions may indicate emotional balance or sometimes emotional suppression.",
        "connection": "In Bangladesh, maintaining neutrality might be a cultural value in certain contexts, especially in professional settings.",
        "recommendations": [
            "Check in with yourself about what you're actually feeling",
            "Consider if you're suppressing emotions for cultural reasons",
            "Practice mindfulness to increase emotional awareness",
        ],
        "local_resources": "Meditation groups in urban areas like Dhaka can help with emotional awareness.",
    },
    "disgust": {
        "description": "Disgust can relate to moral judgments, traumatic memories, or physical aversion.",
        "connection": "In Bangladesh, disgust related to environmental conditions or certain social situations may be common stressors.",
        "recommendations": [
            "Identify exactly what's triggering the disgust response",
            "Consider if this relates to any past experiences",
            "For environmental triggers, focus on what's within your control to change",
        ],
        "local_resources": "Environmental improvement community groups can help address some common disgust triggers.",
    },
}

# Voice emotion descriptions and recommendations
VOICE_EMOTION_INSIGHTS = {
    "happy": {
        "description": "A happy tone in your voice can indicate positive emotional state and well-being.",
        "connection": "In Bangladesh, expressing happiness in your voice is generally culturally appropriate and can strengthen social bonds.",
        "recommendations": [
            "Notice what made you feel happy and try to incorporate more of it in your life",
            "Share this positive feeling with others who might benefit from your support",
            "Use this moment of positivity to address any challenging tasks",
        ],
    },
    "sad": {
        "description": "Sadness in your voice can reflect grief, disappointment, or low mood states.",
        "connection": "In Bangladesh, particularly in rural areas, expressing sadness verbally may be seen as seeking community support.",
        "recommendations": [
            "Allow yourself to experience this emotion without judgment",
            "Reach out to trusted family members or friends",
            "Consider gentle physical activities like walking to help process feelings",
            "If persistent, speaking with a mental health professional can help",
        ],
    },
    "angry": {
        "description": "An angry tone can reflect frustration, perceived injustice, or unmet needs.",
        "connection": "In Bangladeshi culture, anger expression is often moderated, especially in public settings.",
        "recommendations": [
            "Take deep breaths before responding to situations",
            "Identify the source of your anger and whether it relates to deeper issues",
            "Find appropriate outlets for expressing feelings, like writing or physical activity",
            "Consider culturally-appropriate ways to address concerns constructively",
        ],
    },
    "fearful": {
        "description": "Fear in your voice can indicate anxiety, worry, or feeling threatened.",
        "connection": "In Bangladesh, anxiety about social perception and family matters may be reflected in voice patterns.",
        "recommendations": [
            "Practice grounding techniques to reduce immediate anxiety",
            "Identify specific triggers for your fear",
            "Share your concerns with someone you trust",
            "Break down overwhelming situations into manageable steps",
        ],
    },
    "neutral": {
        "description": "A neutral tone may indicate emotional balance or sometimes emotional suppression.",
        "connection": "In professional and formal settings in Bangladesh, a neutral tone is often valued.",
        "recommendations": [
            "Check if you're actually feeling neutral or suppressing emotions",
            "Practice mindfulness to maintain awareness of your emotional state",
            "Consider if this is your typical speaking pattern or a response to current circumstances",
        ],
    },
    "calm": {
        "description": "A calm voice tone suggests emotional regulation and composure.",
        "connection": "In Bangladesh, a calm demeanor in speech is highly valued, especially among elders and leaders.",
        "recommendations": [
            "Notice what helps you maintain this state of calm",
            "Use this composure to address any challenges effectively",
            "Share techniques that help you maintain calm with others who might benefit",
        ],
    },
}


# Facial emotion detection function
def detect_face_emotion(img_array):
    """
    Detect facial emotion from an image using AWS Rekognition (production) or DeepFace (dev)

    Args:
        img_array: NumPy array representation of the image

    Returns:
        Tuple of (emotion, confidence_score)
    """
    try:
        # Use AWS Rekognition if available and configured
        if USE_REKOGNITION:
            emotion, confidence = rekognition.detect_emotion(img_array)
            if emotion:
                logger.info(
                    f"AWS Rekognition detected emotion: {emotion} ({confidence:.2f}%)"
                )
                return emotion, confidence
            else:
                logger.warning("AWS Rekognition failed to detect emotion")
                return None, None

        # Fallback to DeepFace if available
        try:

            result = DeepFace.analyze(
                img_array, actions=["emotion"], enforce_detection=False
            )

            if result and len(result) > 0:
                dominant_emotion = result[0]["dominant_emotion"]
                emotion_score = result[0]["emotion"][dominant_emotion]
                logger.info(
                    f"DeepFace detected emotion: {dominant_emotion} ({emotion_score:.2f}%)"
                )
                return dominant_emotion, emotion_score
            else:
                return None, None
        except NameError:
            logger.error(
                "Neither AWS Rekognition nor DeepFace available for emotion detection"
            )
            return None, None

    except Exception as e:
        logger.error(f"Error in emotion detection: {str(e)}")
        return None, None


# Create a mock model for voice emotion detection (since we don't have a real model)
def create_mock_voice_model():
    """Create a simple mock model for demonstration purposes"""
    temp_dir = tempfile.gettempdir()
    model_path = os.path.join(temp_dir, "voice_emotion_model.pkl")

    if not os.path.exists(model_path):
        # Map of voice features to emotions - this is just a placeholder
        voice_emotions = {
            "calm": [0.1, 0.2, 0.3, 0.4],
            "happy": [0.5, 0.6, 0.7, 0.8],
            "sad": [0.9, 1.0, 1.1, 1.2],
            "angry": [1.3, 1.4, 1.5, 1.6],
            "fearful": [1.7, 1.8, 1.9, 2.0],
            "neutral": [2.1, 2.2, 2.3, 2.4],
        }

        import pickle

        with open(model_path, "wb") as f:
            pickle.dump(voice_emotions, f)

    return model_path


def analyze_voice(file_path):
    """
    Analyze voice to detect emotion using AWS Transcribe + Comprehend (production)
    or fallback to mock analysis (development)

    Args:
        file_path: Path to the audio file

    Returns:
        Tuple of (emotion, confidence_score)
    """
    # Use AWS Voice Sentiment if available
    if USE_VOICE_SENTIMENT:
        try:
            import asyncio

            # Read audio file
            with open(file_path, "rb") as f:
                audio_bytes = f.read()

            # Run async detection in sync context
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Create a new loop if one is already running
                import nest_asyncio

                nest_asyncio.apply()

            emotion, confidence, transcript = asyncio.run(
                voice_sentiment.detect_emotion_from_audio(
                    audio_bytes=audio_bytes,
                    user_id="voice_analysis",
                    language="bangla",  # Can be made dynamic based on user preference
                )
            )

            if emotion and confidence:
                logger.info(
                    f"AWS Voice Sentiment detected: {emotion} ({confidence:.2f}%) "
                    f"from transcript: '{transcript[:50] if transcript else 'N/A'}...'"
                )
                return emotion, confidence
            else:
                logger.warning("AWS Voice Sentiment failed, using fallback")

        except Exception as e:
            logger.error(f"Error using AWS Voice Sentiment: {str(e)}")
            logger.info("Falling back to mock analysis")

    # Fallback: Mock analysis for development
    emotions = ["happy", "sad", "angry", "fearful", "neutral", "calm"]

    # Load audio and extract features (simplified)
    try:
        y, sr = librosa.load(file_path, duration=5)

        # Extract some basic audio features
        # mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        # mfcc_processed = np.mean(mfcc.T, axis=0)

        # In a real implementation, you would use your model here
        # For demonstration, randomly select an emotion
        prediction = random.choice(emotions)
        confidence = random.uniform(60, 95)

        logger.info(f"Mock voice analysis: {prediction} ({confidence:.2f}%)")
        return prediction, confidence

    except Exception as e:
        logger.error(f"Error analyzing voice: {str(e)}")
        return "neutral", 50.0
