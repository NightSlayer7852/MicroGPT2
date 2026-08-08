from __future__ import annotations

from typing import Any, Dict, List

from backend.config import settings
from backend.embedding import EmbeddingManager
from backend.vector_store import VectorStore
from qdrant_client.models import models


class RAGRetriever:
    def __init__(self, vector_store: VectorStore, embedding_manager: EmbeddingManager):
        self.vector_store = vector_store
        self.embedding_manager = embedding_manager

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        print(f"Retrieving documents for query: {query}")

        dense_vector = self.embedding_manager.generate_embeddings([query])[0]

        prefetch = [
            models.Prefetch(query=dense_vector.tolist(), using="dense", limit=20),
            models.Prefetch(
                query=models.Document(text=query, model=settings.sparse_model_name),
                using="sparse",
                limit=20,
            ),
        ]

        results = self.vector_store.client.query_points(
            collection_name=self.vector_store.collection_name,
            prefetch=prefetch,
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=top_k,
            with_payload=True,
        )

        retrieved_docs = []

        for rank, result in enumerate(results.points, start=1):
            payload = result.payload or {}
            retrieved_docs.append(
                {
                    "rank": rank,
                    "score": result.score,
                    "content": payload.get("content"),
                    "chapter": payload.get("chapter"),
                    "page": payload.get("page"),
                }
            )

        return retrieved_docs
