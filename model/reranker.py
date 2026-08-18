from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from sentence_transformers import CrossEncoder

try:
    from .logger import get_logger
except ImportError:
    from logger import get_logger

logger = get_logger("microgpt.reranker")


class DocumentReranker:
    def __init__(self, model_name: Optional[str] = None, batch_size: Optional[int] = None) -> None:
        self.model_name = model_name or os.getenv("RERANKER_MODEL_NAME", "cross-encoder/ms-marco-MiniLM-L-6-v2")
        self.batch_size = batch_size or int(os.getenv("RERANKER_BATCH_SIZE", "16"))
        try:
            logger.info(f"Initializing Reranker model: '{self.model_name}' (batch_size={self.batch_size})...")
            self.model = CrossEncoder(self.model_name)
            logger.info(f"Reranker model '{self.model_name}' loaded successfully.")
        except Exception as exc:
            logger.error(f"Failed to load CrossEncoder model '{self.model_name}': {exc}", exc_info=True)
            raise

    def rerank(self, query: str, retrieved_docs: List[Dict[str, Any]], top_k: Optional[int] = None) -> List[Dict[str, Any]]:
        if not retrieved_docs:
            logger.warning("Rerank requested with empty document list.")
            return []

        valid_docs: List[Dict[str, Any]] = []
        pairs: List[List[str]] = []

        for doc in retrieved_docs:
            content = (doc.get("content") or "").strip()
            if not content:
                continue
            valid_docs.append(doc)
            pairs.append([query, content])

        if not valid_docs:
            logger.warning("No documents with valid content to rerank.")
            return []

        logger.info(f"Reranking {len(valid_docs)} candidate documents for query: \"{query}\"")

        try:
            scores = self.model.predict(pairs, batch_size=self.batch_size)

            reranked_docs: List[Dict[str, Any]] = []
            for doc, score in zip(valid_docs, scores):
                updated_doc = dict(doc)
                updated_doc["retrieval_score"] = doc.get("score")
                updated_doc["score"] = float(score)
                reranked_docs.append(updated_doc)

            reranked_docs.sort(key=lambda d: d["score"], reverse=True)

            for new_rank, doc in enumerate(reranked_docs, start=1):
                doc["rank"] = new_rank

            final_results = reranked_docs[:top_k] if top_k is not None else reranked_docs
            logger.info(f"Reranking completed. Output document count: {len(final_results)}")
            return final_results
        except Exception as exc:
            logger.error(f"Error during document reranking: {exc}", exc_info=True)
            raise

