from __future__ import annotations

from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

try:
    from .logger import get_logger
except ImportError:
    from logger import get_logger

logger = get_logger("microgpt.embedding")


class EmbeddingManager:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model: SentenceTransformer | None = None

    def _load_model(self) -> None:
        if self.model is not None:
            return

        try:
            logger.info(f"Loading dense embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(
                f"Embedding model '{self.model_name}' loaded successfully. Dimensions: {self.model.get_sentence_embedding_dimension()}"
            )
        except Exception as exc:
            logger.error(f"Failed to load embedding model '{self.model_name}': {exc}", exc_info=True)
            raise

    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        self._load_model()

        if not self.model:
            raise ValueError("Embedding model is not loaded.")

        if not texts:
            return np.empty((0, self.model.get_sentence_embedding_dimension()), dtype=np.float32)

        logger.debug(f"Generating dense embeddings for {len(texts)} text input(s)...")

        try:
            embeddings = self.model.encode(
                texts,
                batch_size=32,
                show_progress_bar=False,
                convert_to_numpy=True,
            )
            embeddings = np.asarray(embeddings, dtype=np.float32)
            logger.debug(f"Dense embeddings generated. Shape: {embeddings.shape}")
            return embeddings
        except Exception as exc:
            logger.error(f"Failed to generate dense embeddings: {exc}", exc_info=True)
            raise

