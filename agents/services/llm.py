"""One place that decides which language model runs, and where.

Mirrors `client/src/lib/assessment/llm.ts`: any OpenAI-compatible provider
works, chosen with `OPENAI_BASE_URL` and `OPENAI_API_KEY`, defaulting to
OpenRouter. Point both at Groq, Together, vLLM, Ollama or an OpenAI account
and nothing else in this service changes.

Two surfaces, because there are two kinds of caller:

* `complete()` and `client()` for a plain request and reply, which is what
  labelling and short generation need.
* `chat_model()` for the LangChain and LangGraph code, which needs a
  `BaseChatModel` it can bind tools to and ask for structured output.

Both read the same settings, so the provider is configured once rather than
per call site. Before this, three modules each constructed their own ChatGroq
with a model name written inline, so changing provider meant finding them all.

Models are chosen per task rather than globally, since the work is not all the
same shape. Defaults were picked against OpenRouter's live catalogue on
2026-09-01; both are overridable, and the prices below will drift.
"""

from __future__ import annotations

import logging
from enum import Enum
from functools import lru_cache
from typing import Any

from openai import APIError, AsyncOpenAI, OpenAI

from config.settings import settings

logger = logging.getLogger(__name__)


class Task(str, Enum):
    """What a caller wants the model for. Picks the model, not the prompt."""

    #: Closed-set labelling and short extraction. The answer is one of a fixed
    #: set, so the smallest capable model is the right one.
    CLASSIFY = "classify"

    #: Conversation, tool calling and structured output, for the assistant.
    #: Needs to hold a thread and choose tools, so it cannot be the tiny model.
    CONVERSE = "converse"

    #: Short creative generation: reflection prompts, breathing scripts.
    #: Tolerates a small model but wants more warmth than CLASSIFY.
    COMPOSE = "compose"


#: Cheapest priced model in OpenRouter's catalogue that still follows a closed
#: instruction reliably ($0.017/$0.112 per million tokens). The Next.js side
#: already uses it for exactly this job.
DEFAULT_CLASSIFY_MODEL = "ibm-granite/granite-4.0-h-micro"

#: $0.030/$0.130 per million with tool calling, structured output and a very
#: large context. Roughly a fiftieth of a frontier model's price for work that
#: does not need one.
DEFAULT_CONVERSE_MODEL = "qwen/qwen3.7-flash"

DEFAULT_COMPOSE_MODEL = "mistralai/mistral-nemo"

DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

_TASK_DEFAULTS: dict[Task, str] = {
    Task.CLASSIFY: DEFAULT_CLASSIFY_MODEL,
    Task.CONVERSE: DEFAULT_CONVERSE_MODEL,
    Task.COMPOSE: DEFAULT_COMPOSE_MODEL,
}

# Labelling should be reproducible; composing should not read like a form
# letter. Callers can still override per request.
_TASK_TEMPERATURE: dict[Task, float] = {
    Task.CLASSIFY: 0.0,
    Task.CONVERSE: 0.7,
    Task.COMPOSE: 0.8,
}


def base_url() -> str:
    return getattr(settings, "OPENAI_BASE_URL", "") or DEFAULT_BASE_URL


def api_key() -> str:
    return getattr(settings, "OPENAI_API_KEY", "") or ""


def model_for(task: Task) -> str:
    """The configured model for a task, or its default.

    Settings are named after the task (`LLM_CLASSIFY_MODEL` and so on) so a
    deployment can move one kind of work to a different model without
    disturbing the rest.
    """
    configured = getattr(settings, f"LLM_{task.value.upper()}_MODEL", "")
    return configured or _TASK_DEFAULTS[task]


@lru_cache(maxsize=1)
def client() -> OpenAI:
    """Shared synchronous client. Cached: it holds a connection pool."""
    return OpenAI(api_key=api_key(), base_url=base_url())


@lru_cache(maxsize=1)
def async_client() -> AsyncOpenAI:
    """Shared asynchronous client, for request handlers that await."""
    return AsyncOpenAI(api_key=api_key(), base_url=base_url())


def complete(
    prompt: str,
    *,
    task: Task = Task.CLASSIFY,
    system: str | None = None,
    max_tokens: int = 256,
    temperature: float | None = None,
    model: str | None = None,
) -> str:
    """One prompt in, the reply text out, or an empty string.

    Never raises. Every caller here is enriching something the member has
    already done, and a provider outage should cost them a mood label, not the
    entry they wrote. Callers decide what an empty reply means.
    """
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        response = client().chat.completions.create(
            model=model or model_for(task),
            messages=messages,  # type: ignore[arg-type]
            temperature=_TASK_TEMPERATURE[task] if temperature is None else temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()
    except APIError as error:
        logger.error("llm request failed (%s): %s", task.value, error)
        return ""
    except Exception as error:
        logger.error("llm request failed unexpectedly (%s): %s", task.value, error)
        return ""


async def acomplete(
    prompt: str,
    *,
    task: Task = Task.CLASSIFY,
    system: str | None = None,
    max_tokens: int = 256,
    temperature: float | None = None,
    model: str | None = None,
) -> str:
    """`complete`, awaited. Same contract, including never raising."""
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        response = await async_client().chat.completions.create(
            model=model or model_for(task),
            messages=messages,  # type: ignore[arg-type]
            temperature=_TASK_TEMPERATURE[task] if temperature is None else temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()
    except APIError as error:
        logger.error("llm request failed (%s): %s", task.value, error)
        return ""
    except Exception as error:
        logger.error("llm request failed unexpectedly (%s): %s", task.value, error)
        return ""


def chat_model(task: Task = Task.CONVERSE, **overrides: Any):
    """A LangChain chat model on the same provider and credentials.

    For the LangGraph agent, which binds tools and asks for structured output
    and so needs a `BaseChatModel` rather than a raw completion. Imported
    lazily: the modules that only call `complete()` should not pay for
    langchain_openai at import time.

    Unlike `complete()`, this propagates errors. A tool-calling graph that
    silently received an empty string would take a branch nobody intended.
    """
    from langchain_openai import ChatOpenAI

    params: dict[str, Any] = {
        "model": model_for(task),
        "temperature": _TASK_TEMPERATURE[task],
        "base_url": base_url(),
        "api_key": api_key(),
    }
    params.update(overrides)
    return ChatOpenAI(**params)


def describe() -> dict[str, str]:
    """What this process will actually call, for the health endpoint.

    Deliberately reports whether a key is present, never the key itself.
    """
    return {
        "base_url": base_url(),
        "api_key_present": "yes" if api_key() else "no",
        **{f"{task.value}_model": model_for(task) for task in Task},
    }
