# MicroGPT

A small RAG (Retrieval-Augmented Generation) app: a FastAPI backend answers
questions over an ingested PDF using hybrid (dense + sparse) retrieval,
reranking, and a Groq-hosted LLM, plus a Gradio chat frontend.

## Architecture

```
PDF  --ingest-->  Qdrant (dense + sparse vectors)
                        |
User question --> FastAPI /query --> hybrid retrieve --> rerank --> Groq LLM --> answer
                        ^
                 Gradio chat UI (calls /query over HTTP)
```

## Folder structure

```
MicroGPT/
├── backend/
│   ├── config.py           # env vars -> Settings
│   ├── tracing.py            # optional Langfuse tracing helper
│   ├── embedding.py           # EmbeddingManager (SentenceTransformers, dense)
│   ├── vector_store.py         # Qdrant wrapper (create collection, upsert)
│   ├── retriever.py            # hybrid dense + BM25 retrieval, fused with RRF
│   ├── reranker.py              # cross-encoder reranker
│   ├── graph_retriever.py        # optional Neo4j query expansion
│   ├── rag.py                     # the actual pipeline: retrieve -> rerank -> ask LLM
│   ├── main.py                     # FastAPI app, exposes POST /query
│   ├── cli.py                       # terminal chat loop
│   ├── ingest.py                     # chunk a PDF -> embed -> upload to Qdrant
│   └── evaluate.py                    # RAGAS evaluation over test.txt
├── frontend/
│   └── gradio_app.py                   # chat UI, calls the backend over HTTP
├── requirements.txt
├── pyproject.toml
├── test.txt
└── .env
```

One file per concern, no nested subpackages, no dependency-injection
framework — everything is a plain function or class you can trace top to
bottom.

## Setup

```bash
pip install -r requirements.txt
```

Required environment variables (`.env`):

```bash
QDRANT_URL=...
QDRANT_API_KEY=...
GROQ_API_KEY=...
```

Optional:

```bash
QDRANT_COLLECTION_NAME=chapterwiseReferenceManual   # default
QDRANT_LOCAL_PATH=./qdrant_data                     # used if QDRANT_URL is unreachable
ENABLE_RERANKING=true
RAG_TOP_K=20
NEO4J_URI=...
NEO4J_USERNAME=...
NEO4J_PASSWORD=...                                  # optional graph expansion
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com         # optional tracing
```

Every optional integration (Neo4j, Langfuse) degrades gracefully to a
no-op if unconfigured — the app runs with just Qdrant + Groq.

## Running it

```bash
# 1. Ingest a PDF into Qdrant (run once per document)
python -m backend.ingest path/to/manual.pdf --chapter "Chapter 1"

# 2. Start the backend
uvicorn backend.main:app --reload

# 3. Start the frontend (in a second terminal)
python frontend/gradio_app.py
```

Or skip the frontend and use the terminal chat loop:

```bash
python -m backend.cli
```

### RAGAS evaluation

Populate `test.txt` with `question|reference_answer` lines (one per line,
reference answer optional), then:

```bash
python -m backend.evaluate
```

## What changed in this pass

Kept all existing functionality (hybrid retrieval, reranking, graph
expansion, caching, tracing) and fixed the following:

1. **Fixed a real retrieval bug**: `EmbeddingManager.generate_embeddings`
   double-wrapped the output array whenever exactly one text was embedded —
   which is every query, since a query is always a single string. This
   silently turned every query's embedding into a malformed shape, breaking
   dense retrieval. Removed the incorrect special case.
2. **Fixed a real retrieval bug**: the hybrid retriever asked Qdrant for
   server-side sparse embeddings using the model name `"bm25"`, but the
   registered/configured model name is `"Qdrant/bm25"` — every hybrid query
   was failing. Now reads `settings.sparse_model_name` instead of a
   hardcoded, wrong string.
3. **Made Langfuse tracing actually work**: the tracing helper was a dead
   shim — `get_langfuse_client()` returned the raw `langfuse` module (not a
   client), and the LangChain callback handler always returned `None`, so
   every span/trace call was silently a no-op despite the elaborate plumbing
   in the RAG pipeline. Rewired it against the real, installed Langfuse v4
   SDK (`get_client()`, `start_as_current_observation`,
   `langfuse.langchain.CallbackHandler`), with a genuine no-op fallback only
   when credentials aren't configured. Also added the `langchain` package as
   a dependency — Langfuse's LangChain integration hard-requires it and it
   was missing.
4. **Added the missing ingestion pipeline**: there was no code anywhere
   that ever populated Qdrant — the retriever assumed data would already be
   there. Added `backend/ingest.py` (chunk PDF → dense + sparse embed →
   upsert).
5. **Added a Gradio frontend** (`frontend/gradio_app.py`) — a small chat UI
   that POSTs to the backend's `/query` endpoint and renders the answer with
   its sources.
6. **Flattened the folder structure** for readability: collapsed
   `app/core/`, `app/services/`, `app/pipelines/`, `app/api/`, `app/cli/`,
   `app/ingestion/`, `app/evaluation/` (7 subpackages, a dataclass-based
   dependency-injection `bootstrap.py`, and a separate `schemas.py`) into a
   single flat `backend/` folder — one file per concern, entrypoints call
   plain functions directly. No behavior change, just fewer places to look.
7. **Removed dead/redundant code**: a duplicate `langfuse_tracing.py` file
   with inconsistent import paths, a `fastembed` sparse model that was
   loaded on every API/CLI startup but never used (moved to ingestion, where
   it's actually needed), a redundant `except (SpecificError, Exception)`
   clause, unused imports, and a `_NoopContextManager` that was only needed
   because tracing used to be fake.

Everything above was verified by running the actual retrieval, reranking,
and ingestion code paths locally (not just read for correctness).
# MicroGPT2
