"""
Embeddings adapter - switches between local and API-based embeddings
Optimized for Bangla/Bengali language support
"""

from config.settings import settings
from utils.logger import logger


def get_embeddings():
    """
    Get embeddings model based on deployment mode

    Returns:
        Embeddings instance compatible with LangChain
    """

    # Priority 1: Use Local HuggingFace Embeddings (Free, No Rate Limits, Good Multilingual Support)
    try:
        from langchain_huggingface import HuggingFaceEmbeddings

        logger.info("Using HuggingFace multilingual embeddings (local)")
        # 'paraphrase-multilingual-MiniLM-L12-v2' is a robust balance of speed/size/quality for En/Bn
        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    except Exception as e:
        logger.error(f"Failed to initialize HuggingFace embeddings: {e}")
        # Fallback logic if needed, or re-raise

    if settings.USE_API_MODELS and settings.COHERE_API_KEY:
        # Fallback/Legacy: Use Cohere API
        try:
            from langchain_cohere import CohereEmbeddings

            logger.info("Using Cohere multilingual embeddings (API)")
            return CohereEmbeddings(
                model="embed-multilingual-v3.0",
                cohere_api_key=settings.COHERE_API_KEY,
            )
        except Exception as e:
            logger.error(f"Failed to initialize Cohere embeddings: {e}")

