"""Minimal Langfuse tracing helper.

Langfuse is entirely optional: if LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY
are not set (or the auth check fails), every function below quietly
no-ops so the rest of the app works without it.
"""
from __future__ import annotations

from typing import Any, Optional

try:
    from .logger import get_logger
except ImportError:
    from logger import get_logger

logger = get_logger("microgpt.tracing")

_client: Optional[Any] = None
_client_checked = False


class _NoopSpan:
    def __enter__(self) -> None:
        return None

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False

    def update(self, **_kwargs: Any) -> None:
        return None


def get_langfuse_client() -> Optional[Any]:
    """Return a cached, authenticated Langfuse client, or None if unavailable."""
    global _client, _client_checked

    if _client_checked:
        return _client

    _client_checked = True
    try:
        from langfuse import get_client

        client = get_client()
        if client.auth_check():
            _client = client
            logger.info("Langfuse tracing enabled and authenticated.")
        else:
            logger.info("Langfuse auth_check failed. Tracing disabled.")
    except Exception as exc:
        logger.info(f"Langfuse tracing disabled: {exc}")

    return _client


def get_langfuse_langchain_handler() -> Optional[Any]:
    """Return a LangChain callback handler if Langfuse is configured, else None."""
    if get_langfuse_client() is None:
        return None

    try:
        from langfuse.langchain import CallbackHandler

        return CallbackHandler()
    except Exception as exc:
        logger.warning(f"Langfuse LangChain handler unavailable: {exc}")
        return None


def start_span(name: str, input_payload: Any = None, metadata: Any = None, as_type: str = "span"):
    """Context manager yielding a span with `.update(output=...)`, or a no-op."""
    client = get_langfuse_client()
    if client is None:
        return _NoopSpan()

    return client.start_as_current_observation(
        name=name,
        as_type=as_type,
        input=input_payload,
        metadata=metadata,
    )

