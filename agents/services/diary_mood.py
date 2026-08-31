"""Mood label for one diary entry.

Derived from plaintext that is never persisted here. The label and its
confidence go back to the app, which stores them beside the ciphertext; a mood
word is not reversible into the entry it came from, so keeping it in clear
costs the member nothing.

The written analysis the previous implementation produced is gone. It was a
sentence or two quoting and paraphrasing the entry, stored in clear next to
the vector, which put back most of what encrypting the entry was for.
"""

import logging
import re

from services.diary_index import MoodResult
from services.llm import Task, complete

logger = logging.getLogger(__name__)

# Closed set. A free-text mood cannot be charted over time, and the trend view
# is the reason the label exists at all.
MOODS = ("happy", "calm", "hopeful", "neutral", "tired", "anxious", "sad", "angry")

_PROMPT = (
    "Read the diary entry and choose the single word from this list that best "
    "describes the writer's mood:\n"
    f"{', '.join(MOODS)}\n\n"
    "Reply with exactly two lines and nothing else:\n"
    "MOOD: <one word from the list>\n"
    "CONFIDENCE: <number between 0 and 1>\n\n"
    "Entry:\n"
)

NEUTRAL = MoodResult(mood="neutral", confidence=0.0)


def _parse(reply: str) -> MoodResult:
    """Reads the model's reply, refusing anything outside the closed set.

    Confidence 0.0 means the label is a fallback rather than a judgement, so
    the interface can decline to show it instead of presenting a guess as an
    observation about somebody's state of mind.
    """
    mood = None
    confidence = 0.0

    for line in reply.splitlines():
        if line.upper().startswith("MOOD:"):
            candidate = line.split(":", 1)[1].strip().lower()
            if candidate in MOODS:
                mood = candidate
        elif line.upper().startswith("CONFIDENCE:"):
            match = re.search(r"[01](?:\.\d+)?", line)
            if match:
                confidence = max(0.0, min(1.0, float(match.group())))

    if mood is None:
        return NEUTRAL
    return MoodResult(mood=mood, confidence=confidence)


def analyze_mood(content: str) -> MoodResult:
    """Labels an entry. Never raises: an entry saves whether or not it scores."""
    text = (content or "").strip()
    if not text:
        return NEUTRAL

    # Labelling, so it runs on the classify model at temperature zero: the
    # same entry should not read cheerful on Tuesday and bleak on Wednesday.
    # `complete` returns "" rather than raising, and an unparseable reply is
    # already the neutral fallback, so there is nothing to catch here.
    reply = complete(_PROMPT + text[:4000], task=Task.CLASSIFY, max_tokens=32)
    return _parse(reply)
