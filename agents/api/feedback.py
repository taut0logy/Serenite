from fastapi import APIRouter, Depends, Request
from models.feedback import Feedback
from middleware.auth import get_current_user

router = APIRouter(prefix="/feedback", tags=["User Feedback"])

feedback_data = []

@router.post("/")
async def submit_feedback(request: Request, feedback: Feedback, user: dict = Depends(get_current_user)):
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


@router.get("/")
async def get_feedback(request: Request, limit: int = 50, user: dict = Depends(get_current_user)):
    """
    Get submitted feedback data (for admin use).

    Args:
        limit: Maximum number of feedback entries to return (defaults to 50)
    """
    global feedback_data

    # Return limited number of most recent feedback entries
    return {"feedback": feedback_data[-limit:] if limit > 0 else feedback_data}


@router.get("/analytics")
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

