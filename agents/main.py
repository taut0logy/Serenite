from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from dotenv import load_dotenv

# Before anything that reads the environment. The router modules below build
# adapters and clients as they import, so loading .env after them left those
# reading an environment that had not been populated yet.
load_dotenv()

from utils.logger import logger
from config.settings import settings
from services.llm import describe as describe_llm
from config.limiter import limiter
from api import (
    chat,
    diary,
    breathing,
    emotion_journal,
    emotion,
    feedback,
    kyc,
    moner_canvus,
)
import uvicorn

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="An advanced mental health support assistant powered by AI",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# Configure rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Include routers with prefix
# app.include_router(test.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(diary.router, prefix=settings.API_PREFIX)
app.include_router(breathing.router, prefix=settings.API_PREFIX)
app.include_router(emotion_journal.router, prefix=settings.API_PREFIX)
app.include_router(emotion.router, prefix=settings.API_PREFIX)
app.include_router(feedback.router, prefix=settings.API_PREFIX)
app.include_router(kyc.router, prefix=settings.API_PREFIX)
app.include_router(moner_canvus.router, prefix=settings.API_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )
    
@app.get("/")
async def root(request: Request):
    """Root endpoint."""
    return {
        "message": "Welcome to the Serenite API",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now().isoformat(),
        "docs_url": f"{request.url_for('swagger_ui_html')}",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now().isoformat(),
        # Which provider and models this process will actually call. Reports
        # whether a key is configured, never the key itself. Worth surfacing:
        # a missing key degrades quietly by design, and this is where that
        # shows up instead of as an unexplained absence of mood labels.
        "llm": describe_llm(),
    }


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("ENVIRONMENT", "development") == "development"
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=reload)
