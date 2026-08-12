from __future__ import annotations

import math
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

def normalize_confidence(score: float) -> float:
    if 0.0 <= score <= 1.0:
        return round(score, 4)
    try:
        val = 1.0 / (1.0 + math.exp(-score))
        return round(val, 4)
    except OverflowError:
        return 0.0 if score < 0 else 1.0

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langfuse import propagate_attributes

try:
    from .agent import should_expand_with_graph
    from .config import settings
    from .embedding import EmbeddingManager
    from .graph_retriever import GraphRetriever
    from .reranker import DocumentReranker
    from .retriever import RAGRetriever
    from .tracing import get_langfuse_langchain_handler, start_span
    from .vector_store import VectorStore
except ImportError:
    from agent import should_expand_with_graph
    from config import settings
    from embedding import EmbeddingManager
    from graph_retriever import GraphRetriever
    from reranker import DocumentReranker
    from retriever import RAGRetriever
    from tracing import get_langfuse_langchain_handler, start_span
    from vector_store import VectorStore

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("Missing required environment variable: GROQ_API_KEY")

llm = ChatGroq(
    api_key=GROQ_API_KEY,
    model=settings.groq_model,
    temperature=settings.groq_temperature,
    max_tokens=settings.groq_max_tokens,
    timeout=None,
    max_retries=settings.groq_max_retries,
)


@dataclass
class RAGComponents:
    embedding_manager: EmbeddingManager
    vector_store: VectorStore
    retriever: RAGRetriever
    reranker: Optional[DocumentReranker]
    graph_retriever: Optional[GraphRetriever]


def build_components(include_graph: bool = False) -> RAGComponents:
    embedding_manager = EmbeddingManager()
    vector_store = VectorStore(
        collection_name=settings.qdrant_collection_name,
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        local_fallback_path=settings.qdrant_local_path,
    )
    retriever = RAGRetriever(vector_store=vector_store, embedding_manager=embedding_manager)
    reranker = DocumentReranker() if settings.enable_reranking else None
    graph_retriever = None

    if include_graph:
        try:
            graph_retriever = GraphRetriever()
            print("Graph retriever initialized successfully.")
        except Exception as exc:
            print(f"Failed to initialize GraphRetriever: {exc}")

    return RAGComponents(
        embedding_manager=embedding_manager,
        vector_store=vector_store,
        retriever=retriever,
        reranker=reranker,
        graph_retriever=graph_retriever,
    )


def contextualize_query(query: str, history: Optional[List[Dict[str, str]]], llm) -> str:
    if not history:
        return query

    history_str = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-4:]])
    prompt = f"""Given the following recent conversation history and a follow-up user message:
- If the follow-up message is a conversational remark, verification, or meta-question (e.g., "are you sure?", "why?", "elaborate", "can you clarify?", "tell me more"), rephrase it into a complete, standalone technical search query focusing on the core technical topic discussed in the previous messages.
- Otherwise, rephrase the follow-up question into a standalone technical question containing all necessary context for documentation lookup.
- Do NOT answer the question. Return ONLY the rephrased standalone technical query.

Recent Conversation History:
{history_str}

Follow-up User Message: {query}

Standalone Technical Query:"""

    try:
        response = llm.invoke(prompt)
        standalone_query = response.content.strip().strip('"').strip("'")
        print(f"[RAG Memory] Contextualized Query: '{query}' -> '{standalone_query}'")
        return standalone_query if standalone_query else query
    except Exception as exc:
        print(f"[RAG Memory] Contextualize query error: {exc}. Using original query.")
        return query


def rag(
    query,
    retriever,
    llm,
    history: Optional[List[Dict[str, str]]] = None,
    top_k=10,
    return_context=False,
    reranker=None,
    rerank_top_k=None,
    graph_retriever=None,
    tracing_context: Optional[Dict[str, Any]] = None,
):
    print(f"\n=======================================================")
    print(f"[RAG Pipeline] New Query Received: \"{query}\"")
    if history:
        print(f"[RAG Memory] Chat History provided ({len(history)} turns)")
    print(f"=======================================================")

    search_query = query
    if history:
        search_query = contextualize_query(query, history, llm)

    tracing_context = tracing_context or {}

    trace_name = tracing_context.get("trace_name", "rag-request")
    session_id = tracing_context.get("session_id")
    user_id = tracing_context.get("user_id")
    tags = tracing_context.get("tags") or ["microgpt", "rag"]
    trace_metadata = tracing_context.get("metadata") or {}

    with propagate_attributes(
        trace_name=trace_name,
        session_id=session_id,
        user_id=user_id,
        tags=tags,
        metadata=trace_metadata,
    ), start_span(
        trace_name,
        input_payload={"query": query, "search_query": search_query, "top_k": top_k},
        metadata={"component": "rag-pipeline"},
    ) as root_span:
        with start_span(
            "retrieve-base",
            input_payload={"query": search_query, "top_k": top_k},
            metadata={"component": "retrieval"},
        ) as retrieval_span:
            base_results = retriever.retrieve(search_query, top_k=top_k)
            if retrieval_span is not None:
                retrieval_span.update(output={"result_count": len(base_results)})

        print(f"[RAG Pipeline] Base Retrieval candidate count: {len(base_results)}")

        graph_results = []
        if graph_retriever is not None:
            with start_span(
                "agent-route",
                input_payload={"query": query},
                metadata={"component": "agent"},
            ) as route_span:
                use_graph = should_expand_with_graph(query)
                if route_span is not None:
                    route_span.update(output={"use_graph": use_graph})

            print(f"[RAG Pipeline] Knowledge Graph Router decision: use_graph={use_graph}")

            if use_graph:
                try:
                    with start_span(
                        "graph-expansion",
                        input_payload={"query": query},
                        metadata={"component": "graph-retrieval"},
                    ) as graph_span:
                        related_entities = graph_retriever.get_related_entities(query)
                        if related_entities:
                            expanded_query = query + " " + " ".join(related_entities)
                            print(f"[RAG Pipeline] Expanded Query with graph entities: \"{expanded_query}\"")
                            graph_results = retriever.retrieve(expanded_query, top_k=max(3, top_k // 2))

                            for doc in graph_results:
                                doc["score"] *= 0.8

                        if graph_span is not None:
                            graph_span.update(
                                output={
                                    "related_entity_count": len(related_entities or []),
                                    "graph_result_count": len(graph_results),
                                }
                            )
                except Exception as exc:
                    print(f"[Graph Retrieval Error]: {exc}")

        all_results = base_results + graph_results
        seen = set()
        unique_results = []

        for doc in all_results:
            key = (doc["content"], doc.get("page"))
            if key not in seen:
                seen.add(key)
                unique_results.append(doc)

        print(f"[RAG Pipeline] Deduplicated candidates count: {len(unique_results)}")

        if reranker is not None and unique_results:
            print(f"[RAG Pipeline] Reranking {len(unique_results)} candidates using CrossEncoder...")
            with start_span(
                "rerank-documents",
                input_payload={"candidate_count": len(unique_results)},
                metadata={"component": "reranker"},
            ) as rerank_span:
                unique_results = reranker.rerank(query, unique_results, top_k=rerank_top_k or top_k)
                if rerank_span is not None:
                    rerank_span.update(output={"result_count": len(unique_results)})

        if not unique_results:
            print(f"[RAG Pipeline] [WARNING] NO RELEVANT CONTEXT FOUND! (Retriever returned 0 matching documents)")
            print(f"=======================================================\n")
            if root_span is not None:
                root_span.update(output={"answer": "No relevant context found.", "confidence": 0.0})
            return {"answer": "No relevant context found.", "sources": [], "confidence": 0.0}

        print(f"[RAG Pipeline] Sending prompt with {len(unique_results)} context chunks to Groq LLM ({settings.groq_model})...")

        context = "\n\n".join([doc["content"] for doc in unique_results])
        sources = [
            {"chapter": doc.get("chapter"), "page": doc.get("page"), "score": doc.get("score")}
            for doc in unique_results
        ]
        confidence = normalize_confidence(max([doc["score"] for doc in unique_results]))

        formatted_history = ""
        if history:
            formatted_history = "\nRecent Conversation History:\n" + "\n".join(
                [f"{m['role'].capitalize()}: {m['content']}" for m in history[-4:]]
            ) + "\n"

        prompt = f"""
You are an expert technical documentation assistant.

GUIDELINES:
- Base your technical answers on the provided Context and Recent Conversation History.
- If the user asks a conversational, verification, or clarification question (e.g., "Are you sure?", "Why?", "Can you elaborate?", "Explain simpler"), use the Recent Conversation History to identify the technical topic being discussed, and use the Context to confirm, explain the technical reasoning, or elaborate clearly.
- Do NOT say "the context does not mention 'are you sure?'". Address the underlying technical topic being discussed in the conversation.
- If specific technical details requested are absent from the context, state "Not specified in the documentation".
{formatted_history}
When answering:
- Identify ALL relevant components involved in the query.
- Provide a complete, structured explanation covering those components.
- Do NOT skip necessary steps if they are mentioned in context.

If the question involves configuration, provide a step-by-step answer.

Context:
{context}

User Question / Follow-up:
{query}

FORMAT:

Answer:
<structured answer>

Citations:
- Page <number>: "<exact sentence>"

Confidence:
<High / Medium / Low>

Follow-up Questions:
<generate 2 or 3 highly relevant follow-up questions based on the topic and context provided>
"""

        with start_span(
            "generate-answer",
            input_payload={"query": query, "context_doc_count": len(unique_results)},
            metadata={"component": "llm"},
            as_type="generation",
        ) as generation_span:
            callback_handler = get_langfuse_langchain_handler()
            if callback_handler is not None:
                response = llm.invoke(
                    prompt,
                    config={"callbacks": [callback_handler], "run_name": "rag-answer-generation"},
                )
            else:
                response = llm.invoke(prompt)

            if generation_span is not None:
                generation_span.update(output={"answer_preview": response.content[:400], "confidence": confidence})

        print(f"[RAG Pipeline] LLM Response generated successfully! Confidence: {confidence:.4f}")
        print(f"=======================================================\n")

        output = {"answer": response.content, "sources": sources, "confidence": confidence}

        if return_context:
            output["context"] = context

        if root_span is not None:
            root_span.update(
                output={
                    "answer_preview": response.content[:400],
                    "source_count": len(sources),
                    "confidence": confidence,
                }
            )

        return output
