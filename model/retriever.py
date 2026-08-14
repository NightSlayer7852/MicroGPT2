from __future__ import annotations

from typing import Any, Dict, List

try:
    from .config import settings
    from .embedding import EmbeddingManager
    from .vector_store import VectorStore
except ImportError:
    from config import settings
    from embedding import EmbeddingManager
    from vector_store import VectorStore
from qdrant_client.models import models


class RAGRetriever:
    def __init__(self, vector_store: VectorStore, embedding_manager: EmbeddingManager):
        self.vector_store = vector_store
        self.embedding_manager = embedding_manager

    def retrieve(self, query: str, top_k: int = 5, collection_name: Optional[str] = None) -> List[Dict[str, Any]]:
        target_collection = collection_name or self.vector_store.collection_name or "STM32F1"
        try:
            points_count = self.vector_store.client.get_collection(target_collection).points_count
        except Exception:
            points_count = "unknown"

        print(f"\n[Retrieval Step] Searching Qdrant collection '{target_collection}' (Total points in store: {points_count})")
        print(f"[Retrieval Step] Query: \"{query}\" (Requested top_k={top_k})")

        if points_count == 0:
            print(f"[Retrieval Step] [WARNING] Collection '{target_collection}' has 0 points! Have you run ingest.py to add documents?")

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
            collection_name=target_collection,
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

        print(f"[Retrieval Step] Retrieved {len(retrieved_docs)} candidate documents from Qdrant.")
        for idx, doc in enumerate(retrieved_docs, start=1):
            snippet = (doc['content'][:80] + '...') if doc.get('content') else 'N/A'
            print(f"   |- [{idx}] Score: {doc['score']:.4f} | Chapter: {doc.get('chapter')} | Page: {doc.get('page')} | Snippet: {snippet}")

        return retrieved_docs
