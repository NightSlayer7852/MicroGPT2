from __future__ import annotations

from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingManager:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model: SentenceTransformer | None = None

    def _load_model(self) -> None:
        if self.model is not None:
            return

        try:
            print(f"Loading Embedding Model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            print(f"Model loaded successfully. Embedding Dimensions: {self.model.get_sentence_embedding_dimension()}")
        except Exception as exc:
            print(f"Error loading model {self.model_name}: {exc}")
            raise

    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        self._load_model()

        if not self.model:
            raise ValueError("Model not loaded.")

        if not texts:
            return np.empty((0, self.model.get_sentence_embedding_dimension()), dtype=np.float32)

        print(f"Generating embeddings for {len(texts)} texts")

        embeddings = self.model.encode(
            texts,
            batch_size=32,
            show_progress_bar=True,
            convert_to_numpy=True,
        )
        embeddings = np.asarray(embeddings, dtype=np.float32)

        print(f"Embeddings generated successfully. Shape: {embeddings.shape}")
        return embeddings
