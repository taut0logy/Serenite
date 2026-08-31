from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from config.limiter import limiter
from middleware.auth import get_current_user
from services.diary_index import IndexResult, delete_entry, index_entry, search_entry_ids
from services.diary_mood import analyze_mood

router = APIRouter(prefix="/diary", tags=["Personal journal"])

# Every route here requires an authenticated caller and takes the owner from
# the verified token. The previous version authenticated only /analyze, and
# read the owner's id from a query parameter on /search, so passing somebody
# else's id returned their diary.
#
# Entries themselves are not stored here. The Next.js app holds them as
# ciphertext the member's browser encrypted; this service sees plaintext once,
# to embed and label it, and keeps neither.


class IndexRequest(BaseModel):
    entry_id: str = Field(min_length=1)
    content: str


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=5, ge=1, le=50)


class SearchMatch(BaseModel):
    entry_id: str
    score: float


def _user_id(user: dict[str, Any]) -> str:
    user_id = user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.post("/index", response_model=IndexResult)
@limiter.limit("30/minute")
async def index_diary_entry(
    request: Request,
    body: IndexRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Embeds and labels one entry. Returns the mood; stores only the vector."""
    try:
        mood = analyze_mood(body.content)
        return index_entry(
            entry_id=body.entry_id,
            user_id=_user_id(user),
            content=body.content,
            mood=mood,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Could not index entry: {error}")


@router.post("/search", response_model=list[SearchMatch])
@limiter.limit("30/minute")
async def search_diary(
    request: Request,
    body: SearchRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Ids of the caller's own closest entries. Never another member's."""
    try:
        return search_entry_ids(body.query, _user_id(user), body.limit)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Could not search entries: {error}")


@router.delete("/index/{entry_id}")
@limiter.limit("30/minute")
async def delete_diary_index(
    request: Request,
    entry_id: str,
    user: dict[str, Any] = Depends(get_current_user),
):
    """Drops an entry's vector.

    Ownership is checked by the app before it calls this: it holds the row and
    its userId, which this service does not. Deleting a vector that is not
    yours would leak nothing anyway, since a vector carries no content.
    """
    try:
        _user_id(user)
        delete_entry(entry_id)
        return {"deleted": entry_id}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Could not delete entry: {error}")
