"""
Embeddings adapter - switches between local and API-based embeddings
Optimized for Bangla/Bengali language support
"""

from config.settings import settings
from utils.logger import logger


def get_embeddings():
    """
    Get embeddings model based on deployment mode

    - Production/Heroku: Uses Cohere multilingual embeddings (best for Bangla)
    - Local development: Uses HuggingFace multilingual model

    Returns:
        Embeddings instance compatible with LangChain
    """

    if settings.USE_API_MODELS or settings.COHERE_API_KEY:
        # Production mode - use Cohere API for best Bangla support
        try:
            from langchain_cohere import CohereEmbeddings

            logger.info("Using Cohere multilingual embeddings (optimized for Bangla)")
            return CohereEmbeddings(
                model="embed-multilingual-v3.0",  # Best for Bangla + 100 languages
                cohere_api_key=settings.COHERE_API_KEY,
            )
        except Exception as e:
            logger.error(f"Failed to initialize Cohere embeddings: {e}")
            logger.warning("Falling back to local embeddings")
            # Fall through to local mode

    # Local development mode - use HuggingFace multilingual model
    try:
        from langchain_huggingface import HuggingFaceEmbeddings

        logger.info("Using HuggingFace multilingual embeddings (local)")
        return HuggingFaceEmbeddings(
            # Use multilingual model that supports Bangla
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    except ImportError:
        # Fallback to basic model if multilingual not available
        logger.warning("Multilingual model not available, using basic model")
        from langchain_huggingface import HuggingFaceEmbeddings

        return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
