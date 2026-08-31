"""Diary indexing: embeddings and mood, and nothing else.

The entry itself belongs to the Next.js app, which stores it as AES-GCM
ciphertext under a key only the member's browser holds. This module receives
plaintext once, derives an embedding and a mood label from it, and persists
neither the text nor anything reversible into it.

That is the whole contract. What lives in the vector collection is a vector,
an entry id and an owner id. Search returns ids; the app decides who may see
which entry and hands back the ciphertext for the browser to open.

This replaces diary_pg.py, which wrote the full HTML body of every entry into
the vector store's metadata and exposed both storing and searching with no
authentication at all, taking the owner's id as an ordinary query parameter.
"""

import logging
import re
from typing import Any

from langchain_postgres import PGVector
from pydantic import BaseModel

from config.settings import settings
from services.embeddings_adapter import get_embeddings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "diary_entries"

# Beyond this a further passage adds little to the embedding and costs latency
# on every save.
MAX_EMBEDDING_CHARS = 1000

# Cosine distance. Above this the match is weak enough that returning it makes
# search feel arbitrary rather than useful.
MAX_MATCH_DISTANCE = 0.35

embeddings = get_embeddings()

vector_store = PGVector(
    embeddings=embeddings,
    collection_name=COLLECTION_NAME,
    connection=settings.DATABASE_URL,
    use_jsonb=True,
)


class MoodResult(BaseModel):
    mood: str
    confidence: float


class IndexResult(BaseModel):
    entry_id: str
    mood: str
    confidence: float


def _text_for_embedding(content: str) -> str:
    """Plain text for the embedding model.

    Entries are rich text, so the markup is stripped: embedding HTML tags
    dilutes the signal with vocabulary the member never wrote. An entry that is
    only images has no text to embed and is given a fixed stand-in so it still
    gets a row and can be listed.
    """
    stripped = re.sub(r"<[^>]*>", " ", content or "")
    stripped = re.sub(r"\s+", " ", stripped).strip()
    return (stripped or "diary entry without text")[:MAX_EMBEDDING_CHARS]


def index_entry(entry_id: str, user_id: str, content: str, mood: MoodResult) -> IndexResult:
    """Embeds one entry.

    Metadata is deliberately limited to the two ids. Anything else risks
    leaking the entry back into a store the member's key does not protect,
    which is exactly the defect this module exists to fix.
    """
    text = _text_for_embedding(content)

    # Replaces rather than appends, so re-saving an edited entry does not leave
    # the previous vector behind to match on text the member has removed.
    vector_store.delete(ids=[entry_id])
    vector_store.add_texts(
        texts=[text],
        metadatas=[{"entry_id": entry_id, "user_id": user_id}],
        ids=[entry_id],
    )

    logger.info("indexed diary entry", extra={"entry_id": entry_id})
    return IndexResult(entry_id=entry_id, mood=mood.mood, confidence=mood.confidence)


def search_entry_ids(query: str, user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    """Entry ids whose embeddings are closest to `query`, for this owner only.

    Returns ids and scores. Resolving them to entries is the app's job, because
    only the app can decide who may read what, and only the browser can decrypt.
    """
    if not query.strip():
        return []

    results = vector_store.similarity_search_with_score(
        query=query, k=limit, filter={"user_id": user_id}
    )

    matches = []
    for doc, score in results:
        if score > MAX_MATCH_DISTANCE:
            continue
        entry_id = doc.metadata.get("entry_id")
        if entry_id:
            matches.append({"entry_id": entry_id, "score": float(score)})

    logger.info("diary search", extra={"matches": len(matches)})
    return matches


def delete_entry(entry_id: str) -> None:
    """Drops an entry's vector. Called when the member deletes the entry."""
    vector_store.delete(ids=[entry_id])
