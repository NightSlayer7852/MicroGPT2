"""Chunk a PDF, embed each chunk, and upload it to Qdrant.

Usage:
    python -m backend.ingest path/to/manual.pdf --chapter "Chapter 1"
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastembed import SparseTextEmbedding
from pypdf import PdfReader

from backend.config import settings
from backend.embedding import EmbeddingManager
from backend.vector_store import VectorStore

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    text = " ".join(text.split())
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def load_pdf_chunks(pdf_path: str, chapter: Optional[str]) -> List[Dict[str, Any]]:
    reader = PdfReader(pdf_path)
    chapter_label = chapter or Path(pdf_path).stem

    documents = []
    for page_number, page in enumerate(reader.pages, start=1):
        for chunk in chunk_text(page.extract_text() or ""):
            documents.append({"content": chunk, "chapter": chapter_label, "page": page_number})

    return documents


def ingest(pdf_path: str, chapter: Optional[str] = None) -> None:
    documents = load_pdf_chunks(pdf_path, chapter)
    if not documents:
        print(f"No extractable text found in {pdf_path}")
        return

    print(f"Extracted {len(documents)} chunks from {pdf_path}")
    texts = [doc["content"] for doc in documents]

    embedding_manager = EmbeddingManager()
    dense_embeddings = embedding_manager.generate_embeddings(texts)

    sparse_model = SparseTextEmbedding(model_name=settings.sparse_model_name)
    sparse_vectors = list(sparse_model.embed(texts))

    vector_store = VectorStore(
        collection_name=settings.qdrant_collection_name,
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        local_fallback_path=settings.qdrant_local_path,
    )
    vector_store.add_documents(documents, dense_embeddings, sparse_vectors)
    print("Ingestion complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Chunk a PDF, embed it, and upload it to Qdrant.")
    parser.add_argument("pdf_path", help="Path to the PDF file to ingest")
    parser.add_argument("--chapter", help="Chapter label stored with each chunk", default=None)
    args = parser.parse_args()
    ingest(args.pdf_path, args.chapter)


if __name__ == "__main__":
    main()
