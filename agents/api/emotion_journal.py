from fastapi import APIRouter
import datetime
from models.emotion import EmotionJournalEntry, EmotionJournalResponse

# Global variable to store emotion journal entries
emotion_journal = []

router = APIRouter(
    prefix="/emotion-journal", tags=["Personal Journal with Emotional Knowledge Base"]
)


@router.get("/", response_model=EmotionJournalResponse)
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


@router.post("/add", response_model=EmotionJournalEntry)
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
