import os
from typing import List, Literal, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Serenite API"
    APP_VERSION: str = "0.2.0"
    DEBUG: bool = False  # Override with DEBUG=True in .env for development
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"


    CLIENT_URL: str = "http://localhost:3000"
    TOKEN_VERIFY_ENDPOINT: str = f"{CLIENT_URL}/api/token/verify"  # Internal REST endpoint

    # Shared secret between Next.js and FastAPI (generate with: openssl rand -hex 32)
    INTERNAL_API_KEY: str

    AUTH_TIMEOUT: int = 10  # seconds

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    BASE_DIR: str = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )

    DATABASE_URL: str

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Convert postgres:// to postgresql:// for SQLAlchemy compatibility"""
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # Language models. Any OpenAI-compatible provider: set the base URL and
    # key and everything in services/llm.py follows. Defaults to OpenRouter.
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""

    # Per-task overrides. Empty means the default in services/llm.py, which is
    # chosen for cost against the work the task actually does.
    LLM_CLASSIFY_MODEL: str = ""
    LLM_CONVERSE_MODEL: str = ""
    LLM_COMPOSE_MODEL: str = ""

    # Retained for the Gemini vision path (drawing analysis) and any provider
    # still configured directly. Optional now that llm.py owns model access.
    GROQ_API_KEY: str = ""
    # Optional: enables the assistant's web-search tool. Absent, the tool is
    # switched off and everything else still runs.
    TAVILY_API_KEY: str = ""

    # Cohere API for embeddings (multilingual support for Bangla)
    COHERE_API_KEY: str = ""

    # AWS Rekognition for face detection/emotion/verification
    AWS_ENDPOINT_URL: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # Google Gemini API for Moner Canvus analysis
    GEMINI_API_KEY: str = ""

    # AWS S3 for temporary file storage (optional)
    USE_S3_STORAGE: bool = True
    S3_TEMP_BUCKET: str = "serenite-temp"

    # Deployment mode
    USE_API_MODELS: bool = True

    # AstraDB settings (optional - now using PostgreSQL)
    ASTRA_DB_ID: str = ""
    ASTRA_DB_APPLICATION_TOKEN: str = ""
    ASTRA_DB_API_ENDPOINT: str = ""

    # Cache settings
    CACHE_TTL: int = 3600  # 1 hour

    # API settings
    API_PREFIX: str = "/api/v1"
    ALLOWED_HOSTS: List[str] = ["*"]

    # File upload settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".txt", ".jpg", ".jpeg", ".png", ".pdf"]

    # JWT settings
    # JWT_SECRET: str

    # Security settings
    CORS_ORIGINS: List[str] = ["*"]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]

    TF_ENABLE_ONEDNN_OPTS: int = 0  # Disable oneDNN optimizations for TensorFlow

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
