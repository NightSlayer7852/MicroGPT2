from __future__ import annotations

import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

import spaces
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .config import settings
    from .logger import get_logger
    from .rag import RAGComponents, build_components, llm, rag
except ImportError:
    from config import settings
    from logger import get_logger
    from rag import RAGComponents, build_components, llm, rag

logger = get_logger("microgpt.api")


class MessageTurn(BaseModel):
    role: str
    content: str


class QueryRequest(BaseModel):
    query: str
    history: Optional[List[MessageTurn]] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    tags: Optional[List[str]] = None
    collection_name: Optional[str] = None
    learning_style: Optional[str] = "detailed"


class Source(BaseModel):
    chapter: Optional[str] = None
    page: Optional[int] = None
    score: Optional[float] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    confidence: float


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MicroGPT API application lifespan initialization...")
    try:
        app.state.components = build_components(include_graph=True)
        logger.info("MicroGPT API startup sequence completed successfully.")
        yield
    except Exception as exc:
        logger.critical(f"Critical error during API startup component initialization: {exc}", exc_info=True)
        raise exc
    finally:
        logger.info("Shutting down MicroGPT API application...")
        graph_retriever = getattr(app.state.components, "graph_retriever", None)
        if graph_retriever is not None:
            graph_retriever.close()
        logger.info("MicroGPT API shutdown complete.")


app = FastAPI(title="MicroGPT RAG API", lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://microgpt-vert.vercel.app",
    "https://micro-gpt-frontend.vercel.app",
    "https://micro-gpt-backend.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in origins:
    origins.append(frontend_url)

client_url = os.getenv("CLIENT_URL")
if client_url and client_url not in origins:
    origins.append(client_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_components(request: Request) -> RAGComponents:
    return request.app.state.components


@spaces.GPU(duration=60)
def execute_rag_pipeline(query, retriever, llm, history_turns, top_k, reranker, rerank_top_k, graph_retriever, tracing_context, collection_name, learning_style):
    return rag(
        query,
        retriever,
        llm,
        history=history_turns,
        top_k=top_k,
        return_context=False,
        reranker=reranker,
        rerank_top_k=rerank_top_k,
        graph_retriever=graph_retriever,
        tracing_context=tracing_context,
        collection_name=collection_name,
        learning_style=learning_style,
    )


@app.post("/query", response_model=QueryResponse)
def query_model(request: QueryRequest, components: RAGComponents = Depends(get_components)):
    start_time = time.time()
    request_session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"Received POST /query [session_id='{request_session_id}', user_id='{request.user_id}', collection='{request.collection_name}', style='{request.learning_style}']")
    logger.info(f"Query text: \"{request.query}\"")

    try:
        history_turns = (
            [{"role": turn.role, "content": turn.content} for turn in request.history]
            if request.history
            else None
        )
        response = execute_rag_pipeline(
            request.query,
            components.retriever,
            llm,
            history_turns,
            settings.rag_top_k,
            components.reranker,
            settings.rerank_top_k,
            components.graph_retriever,
            {
                "trace_name": "api-query",
                "user_id": request.user_id,
                "session_id": request_session_id,
                "tags": request.tags or ["api", "microgpt", "rag"],
                "metadata": {"endpoint": "/query", "learning_style": request.learning_style},
            },
            request.collection_name,
            request.learning_style,
        )

        elapsed = time.time() - start_time
        logger.info(f"Successfully processed POST /query [session_id='{request_session_id}'] in {elapsed:.2f}s")
        return QueryResponse(answer=response["answer"], sources=response["sources"], confidence=response["confidence"])
    except Exception as exc:
        elapsed = time.time() - start_time
        err_msg = str(exc)
        logger.error(f"Exception processing POST /query [session_id='{request_session_id}'] after {elapsed:.2f}s: {err_msg}", exc_info=True)
        if "RateLimitError" in err_msg or "rate_limit_exceeded" in err_msg or "429" in err_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limit reached for Groq API. Please wait a few minutes before trying again."
            )
        elif "organization_restricted" in err_msg:
            raise HTTPException(
                status_code=403,
                detail="Groq organization restricted. Please check your API key on console.groq.com."
            )
        raise HTTPException(status_code=500, detail=err_msg)


@app.get("/")
def read_root():
    logger.info("Received GET / health check.")
    return {"message": "MicroGPT API is running. Use /query to interact with the model."}

