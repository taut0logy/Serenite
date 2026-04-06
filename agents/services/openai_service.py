"""
OpenAI LLM Service.

Provides a drop-in replacement interface for GeminiService using OpenAI's SDK.
Supports GPT-4o and other models.
"""

import json
from typing import Optional, Dict, Any, List, AsyncIterator
from dataclasses import dataclass

from openai import AsyncOpenAI

from config.settings import settings
from utils.logger import logger


@dataclass
class GenerationConfig:
    """Configuration for content generation."""

    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int = 40  # OpenAI doesn't strictly use top_k in ChatCompletion, but keeps interface consistent
    max_output_tokens: int = 4096  # aligned with typical max output
    system_instruction: Optional[str] = None
    response_mime_type: Optional[str] = None  # "application/json" for JSON mode


class LLMService:
    """
    OpenAI LLM service using openai SDK.

    Supports:
    - Text generation
    - JSON mode
    - Streaming
    - System instructions
    - Structured Outputs (via response_format)
    """

    def __init__(self, base_url: str = None, model: str = None):
        """Initialize OpenAI client."""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url=base_url)
        self.model = model or "gpt-4o"
        self.default_config = GenerationConfig()

    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
        context: Optional[str] = None,
    ) -> str:
        """
        Generate text content.
        """
        cfg = config or self.default_config

        # Build contents
        # OpenAI expects a list of messages for chat models
        messages = []

        if cfg.system_instruction:
            messages.append({"role": "system", "content": cfg.system_instruction})

        user_content = prompt
        if context:
            user_content = f"Context:\n{context}\n\nRequest:\n{prompt}"

        messages.append({"role": "user", "content": user_content})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=cfg.temperature,
                max_tokens=cfg.max_output_tokens,
                top_p=cfg.top_p,
                # top_k is not supported directly in ChatCompletion create
            )
            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise

    async def generate_json(
        self,
        prompt: str,
        schema_hint: Optional[str] = None,
        config: Optional[GenerationConfig] = None,
    ) -> Dict[str, Any]:
        """
        Generate JSON output using JSON mode.
        """
        cfg = config or GenerationConfig(
            temperature=0.3, response_mime_type="application/json"
        )

        enhanced_prompt = prompt
        if schema_hint:
            enhanced_prompt = (
                f"{prompt}\n\nExpected JSON format (adhere strictly):\n{schema_hint}"
            )

        # Force JSON mode
        kwargs = {"response_format": {"type": "json_object"}}

        try:
            messages = []
            if cfg.system_instruction:
                messages.append({"role": "system", "content": cfg.system_instruction})

            # OpenAI requires "json" word in prompt for json mode usually, but strict mode handles it?
            # Safe bet is to ensure "json" is in prompt or system message if using json_object
            if (
                "json" not in enhanced_prompt.lower()
                and "json" not in (cfg.system_instruction or "").lower()
            ):
                enhanced_prompt += "\nRespond in valid JSON."

            messages.append({"role": "user", "content": enhanced_prompt})

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=cfg.temperature,
                max_tokens=cfg.max_output_tokens,
                top_p=cfg.top_p,
                **kwargs,
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            logger.error(f"OpenAI JSON generation failed: {e}")
            raise

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Dict[str, Any],
        config: Optional[GenerationConfig] = None,
    ) -> Dict[str, Any]:
        """
        Generate structured output using Structured Outputs (json_schema).
        """
        cfg = config or GenerationConfig(temperature=0.3)

        try:
            messages = []
            if cfg.system_instruction:
                messages.append({"role": "system", "content": cfg.system_instruction})

            messages.append({"role": "user", "content": prompt})

            # Use new Structured Outputs format
            response_format = {
                "type": "json_schema",
                "json_schema": {
                    "name": "structured_response",
                    "schema": response_schema,
                    "strict": True,
                },
            }

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=cfg.temperature,
                max_tokens=cfg.max_output_tokens,
                top_p=cfg.top_p,
                response_format=response_format,
            )

            content = response.choices[0].message.content
            return json.loads(content)

        except Exception as e:
            logger.error(f"OpenAI Structured generation failed: {e}")
            raise

    async def generate_stream(
        self, prompt: str, config: Optional[GenerationConfig] = None
    ) -> AsyncIterator[str]:
        """
        Stream generated content.
        """
        cfg = config or self.default_config

        messages = []
        if cfg.system_instruction:
            messages.append({"role": "system", "content": cfg.system_instruction})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=cfg.temperature,
                max_tokens=cfg.max_output_tokens,
                top_p=cfg.top_p,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"OpenAI streaming failed: {e}")
            raise

    async def chat(
        self, messages: List[Dict[str, str]], config: Optional[GenerationConfig] = None
    ) -> str:
        """
        Multi-turn chat.
        """
        cfg = config or self.default_config

        # OpenAI messages format matches input usually: {"role": "user"|"assistant"|"system", "content": "..."}
        # Assuming input uses "model" role for assistant as per GeminiService
        adapted_messages = []
        if cfg.system_instruction:
            adapted_messages.append(
                {"role": "system", "content": cfg.system_instruction}
            )

        for msg in messages:
            role = msg["role"]
            if role == "model":
                role = "assistant"
            adapted_messages.append({"role": role, "content": msg["content"]})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=adapted_messages,
                temperature=cfg.temperature,
                max_tokens=cfg.max_output_tokens,
                top_p=cfg.top_p,
            )
            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"OpenAI chat failed: {e}")
            raise


# Factory functions
def get_llm_service(model: str = None) -> LLMService:
    """Get OpenAI service instance."""
    return LLMService(model=model)


# Singleton for convenience
llm_service = LLMService()
