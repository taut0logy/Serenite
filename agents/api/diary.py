from fastapi import APIRouter, Depends, Request, HTTPException
from typing import List
from services.diary import (
    DiaryEntry,
    StoredDiaryEntry,
    MoodAnalysis,
    analyze_diary_entry,
    store_diary_entry,
    search_diary_entries,
)


router = APIRouter(prefix="/diary", tags=["Personal Journal with Emotional Knowledge Base"])


@router.post("/analyze", response_model=MoodAnalysis)
async def analyze_diary(entry: DiaryEntry):
    """Analyze a diary entry and return mood analysis."""
    try:
        return analyze_diary_entry(entry)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in mood analysis: {str(e)}")


@router.post("/store", response_model=StoredDiaryEntry)
async def store_diary(entry: DiaryEntry):
    """Store a diary entry in AstraDB with mood analysis."""
    try:
        return store_diary_entry(entry)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error storing diary entry: {str(e)}"
        )


@router.get("/search", response_model=List[StoredDiaryEntry])
async def search_diary(query: str, user_id: str, limit: int = 5):
    """Search diary entries using semantic search."""
    try:
        return search_diary_entries(query, user_id, limit)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error searching diary entries: {str(e)}"
        )
