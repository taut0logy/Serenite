"""Short-term emotion journal for the assistant.

Entries live in memory only and are keyed by the authenticated user. Both
routes previously took no auth and appended to one process-global list, so any
caller could read back what any other person had written, and could do so
without signing in at all.

This is a working set, not a record: it holds the last few entries per user to
give the assistant recent context, and it is lost on restart. The durable,
encrypted journal is the diary.
"""

from collections import defaultdict
from typing import Any
import datetime

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import get_current_user
from models.emotion import EmotionJournalEntry, EmotionJournalResponse

# user id -> that user's entries. Never iterate across users.
_journals: dict[str, list[dict]] = defaultdict(list)

MAX_ENTRIES_PER_USER = 30
MIN_ENTRIES_FOR_PATTERNS = 5

router = APIRouter(
    prefix="/emotion-journal", tags=["Personal Journal with Emotional Knowledge Base"]
)


def _user_id(user: dict[str, Any]) -> str:
    """Same guard the diary uses: no id means no request."""
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


def _hour_of(timestamp: Any) -> int:
    if isinstance(timestamp, datetime.datetime):
        return timestamp.hour
    if isinstance(timestamp, dict):
        return timestamp.get("hour", 0)
    return 0


def _most_common(values: list[str]) -> str:
    return max(set(values), key=values.count) if values else "No data"


def _patterns(entries: list[dict]) -> dict | None:
    """Rough shape of someone's recent entries, or nothing if too few to say."""
    if len(entries) < MIN_ENTRIES_FOR_PATTERNS:
        return None

    counts: dict[str, int] = {}
    by_part: dict[str, list[str]] = {"morning": [], "afternoon": [], "evening": []}

    for entry in entries:
        emotion = entry["emotion"].lower()
        counts[emotion] = counts.get(emotion, 0) + 1

        hour = _hour_of(entry["timestamp"])
        if 5 <= hour <= 11:
            by_part["morning"].append(entry["emotion"])
        elif 12 <= hour <= 17:
            by_part["afternoon"].append(entry["emotion"])
        elif 18 <= hour <= 23:
            by_part["evening"].append(entry["emotion"])

    return {
        "most_common": max(counts.items(), key=lambda kv: kv[1])[0] if counts else None,
        "time_patterns": {part: _most_common(vals) for part, vals in by_part.items()},
    }


@router.get("/", response_model=EmotionJournalResponse)
async def get_emotion_journal(user: dict[str, Any] = Depends(get_current_user)):
    """The caller's own entries, with a pattern summary once there are enough."""
    entries = _journals.get(_user_id(user), [])
    return {"entries": entries, "patterns": _patterns(entries)}


@router.post("/add", response_model=EmotionJournalEntry)
async def add_to_emotion_journal(
    entry: EmotionJournalEntry,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Appends to the caller's own journal, keeping only the most recent entries."""
    if not entry.timestamp:
        entry.timestamp = datetime.datetime.now()

    stored = entry.model_dump()
    entries = _journals[_user_id(user)]
    entries.append(stored)
    del entries[:-MAX_ENTRIES_PER_USER]

    return stored
