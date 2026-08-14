from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    qdrant_url: str | None
    qdrant_api_key: str | None
    qdrant_collection_name: str
    qdrant_local_path: str
    sparse_model_name: str
    rag_top_k: int
    enable_reranking: bool
    rerank_top_k: int
    groq_api_key: str | None
    groq_model: str
    groq_temperature: float
    groq_max_tokens: int
    groq_max_retries: int
    neo4j_uri: str | None
    neo4j_username: str | None
    neo4j_password: str | None
    neo4j_database: str


AVAILABLE_COLLECTIONS = [
    "STM32F1",
    "STM32F4",
    "STM32G0",
    "STM32G4",
    "STM32L4",
    "STM32U5",
    "STM32WB",
    "STM32WL",
]


def get_settings() -> Settings:
    rag_top_k = int(os.getenv("RAG_TOP_K", "20"))

    return Settings(
        qdrant_url=os.getenv("QDRANT_URL"),
        qdrant_api_key=os.getenv("QDRANT_API_KEY"),
        qdrant_collection_name=os.getenv("QDRANT_COLLECTION_NAME", "STM32F1"),
        qdrant_local_path=os.getenv("QDRANT_LOCAL_PATH", "./qdrant_data"),
        sparse_model_name=os.getenv("SPARSE_MODEL_NAME", "Qdrant/bm25"),
        rag_top_k=rag_top_k,
        enable_reranking=_as_bool(os.getenv("ENABLE_RERANKING"), default=True),
        rerank_top_k=int(os.getenv("RERANK_TOP_K") or os.getenv("RERANKING_TOP_K") or str(rag_top_k)),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        groq_model=os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
        groq_temperature=float(os.getenv("GROQ_TEMPERATURE", "0")),
        groq_max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "1024")),
        groq_max_retries=int(os.getenv("GROQ_MAX_RETRIES", "2")),
        neo4j_uri=os.getenv("NEO4J_URI"),
        neo4j_username=os.getenv("NEO4J_USERNAME"),
        neo4j_password=os.getenv("NEO4J_PASSWORD"),
        neo4j_database=os.getenv("NEO4J_DATABASE", "neo4j"),
    )


settings = get_settings()
