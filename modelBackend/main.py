from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import settings
from backend.rag import RAGComponents, build_components, llm, rag


class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    tags: Optional[List[str]] = None


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
    app.state.components = build_components(include_graph=True)
    try:
        yield
    finally:
        graph_retriever = app.state.components.graph_retriever
        if graph_retriever is not None:
            graph_retriever.close()


app = FastAPI(title="MicroGPT RAG API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_components(request: Request) -> RAGComponents:
    return request.app.state.components


@app.post("/query", response_model=QueryResponse)
def query_model(request: QueryRequest, components: RAGComponents = Depends(get_components)):
    try:
        request_session_id = request.session_id or str(uuid.uuid4())
        response = rag(
            request.query,
            components.retriever,
            llm,
            top_k=settings.rag_top_k,
            return_context=False,
            reranker=components.reranker,
            rerank_top_k=settings.rerank_top_k,
            graph_retriever=components.graph_retriever,
            tracing_context={
                "trace_name": "api-query",
                "user_id": request.user_id,
                "session_id": request_session_id,
                "tags": request.tags or ["api", "microgpt", "rag"],
                "metadata": {"endpoint": "/query"},
            },
        )
        return QueryResponse(answer=response["answer"], sources=response["sources"], confidence=response["confidence"])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/")
def read_root():
    return {"message": "MicroGPT API is running. Use /query to interact with the model."}
