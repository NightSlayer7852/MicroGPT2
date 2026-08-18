from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

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
    from .logger import get_logger
    from .reranker import DocumentReranker
    from .retriever import RAGRetriever
    from .tracing import get_langfuse_langchain_handler, start_span
    from .vector_store import VectorStore
except ImportError:
    from agent import should_expand_with_graph
    from config import settings
    from embedding import EmbeddingManager
    from graph_retriever import GraphRetriever
    from logger import get_logger
    from reranker import DocumentReranker
    from retriever import RAGRetriever
    from tracing import get_langfuse_langchain_handler, start_span
    from vector_store import VectorStore

logger = get_logger("microgpt.rag")


def build_prompt(style_key: str, query: str, context: str, history_str: str) -> str:
    history_section = f"\nRecent History:\n{history_str}\n" if history_str else ""
    citation_instruction = "Citations:\n- Page <number>: \"<exact quote>\" (provide top 5 citations max)"

    if style_key == "simple":
        return f"""You are MicroGPT, an STM32 learning assistant.
Explain in simple, beginner-friendly language with easy analogies. Avoid unexplained jargon.
{history_section}
Context:
{context}

Question: {query}

Format:
Answer:
<simple, easy-to-understand explanation>

{citation_instruction}

Follow-up Questions:
- <3 beginner-friendly technical follow-up questions>"""

    elif style_key == "concise":
        return f"""You are MicroGPT, an STM32 technical reference engine.
Give a direct, crisp answer with zero fluff. State register values, pin mappings, or code immediately.
{history_section}
Context:
{context}

Question: {query}

Format:
Answer:
<direct, short, crisp answer>

{citation_instruction}

Follow-up Questions:
- <3 concise technical follow-up questions>"""

    elif style_key == "tutor":
        return f"""You are MicroGPT, an expert STM32 technical mentor and teacher.
Explain step-by-step like a teacher, building up from basic concepts to advanced configuration with practical walkthroughs.
{history_section}
Context:
{context}

Question: {query}

Format:
Answer:
<guided step-by-step teaching explanation>

{citation_instruction}

Follow-up Questions:
- <3 guided technical follow-up questions>"""

    else:  # "detailed" (default)
        return f"""You are MicroGPT, an STM32 technical intelligence engine.
Provide an exhaustive, in-depth technical breakdown covering register bitfields, peripheral configurations, hardware logic, and code.
{history_section}
Context:
{context}

Question: {query}

Format:
Answer:
<exhaustive, in-depth technical breakdown>

{citation_instruction}

Follow-up Questions:
- <3 technical follow-up questions>"""


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY is not set in environment variables.")
    raise ValueError("Missing required environment variable: GROQ_API_KEY")

logger.info(f"Initializing Groq LLM (model='{settings.groq_model}', temp={settings.groq_temperature}, max_tokens={settings.groq_max_tokens})...")
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
    logger.info("Building RAG Components...")
    start_time = time.time()
    
    embedding_manager = EmbeddingManager()
    vector_store = VectorStore(
        collection_name=settings.qdrant_collection_name,
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        local_fallback_path=settings.qdrant_local_path,
    )
    retriever = RAGRetriever(vector_store=vector_store, embedding_manager=embedding_manager)
    
    if settings.enable_reranking:
        logger.info("Reranking enabled. Initializing reranker...")
        reranker = DocumentReranker()
    else:
        logger.info("Reranking disabled via configuration.")
        reranker = None

    graph_retriever = None

    if include_graph:
        try:
            logger.info("Initializing GraphRetriever for Neo4j...")
            graph_retriever = GraphRetriever()
            logger.info("GraphRetriever initialized successfully.")
        except Exception as exc:
            logger.error(f"Failed to initialize GraphRetriever: {exc}", exc_info=True)

    elapsed = time.time() - start_time
    logger.info(f"RAG Components built successfully in {elapsed:.2f}s.")
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
        logger.info(f"[Step 1/5] Contextualizing query with history ({len(history)} turns)...")
        response = llm.invoke(prompt)
        standalone_query = response.content.strip().strip('"').strip("'")
        logger.info(f"Contextualized Query: '{query}' -> '{standalone_query}'")
        return standalone_query if standalone_query else query
    except Exception as exc:
        logger.error(f"Contextualize query error: {exc}. Falling back to original query.", exc_info=True)
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
    collection_name: Optional[str] = None,
    learning_style: Optional[str] = "detailed",
):
    start_time = time.time()
    style_key = (learning_style or "detailed").lower()

    logger.info(f"--- RAG Pipeline Execution Started ---")
    logger.info(f"Query: \"{query}\" | Target Collection: '{collection_name or 'default'}' | Style: '{style_key}' | History Turns: {len(history) if history else 0}")

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
        input_payload={"query": query, "search_query": search_query, "top_k": top_k, "collection_name": collection_name, "learning_style": style_key},
        metadata={"component": "rag-pipeline"},
    ) as root_span:
        logger.info(f"[Step 2/5] Performing vector search (top_k={top_k})...")
        try:
            with start_span(
                "retrieve-base",
                input_payload={"query": search_query, "top_k": top_k, "collection_name": collection_name},
                metadata={"component": "retrieval"},
            ) as retrieval_span:
                base_results = retriever.retrieve(search_query, top_k=top_k, collection_name=collection_name)
                if retrieval_span is not None:
                    retrieval_span.update(output={"result_count": len(base_results)})
        except Exception as exc:
            logger.error(f"Vector search retrieval failed: {exc}", exc_info=True)
            raise

        logger.info(f"Vector search candidate count: {len(base_results)}")

        graph_results = []
        if graph_retriever is not None:
            logger.info("[Step 3/5] Evaluating Router Agent for Knowledge Graph expansion...")
            with start_span(
                "agent-route",
                input_payload={"query": query},
                metadata={"component": "agent"},
            ) as route_span:
                use_graph = should_expand_with_graph(query)
                if route_span is not None:
                    route_span.update(output={"use_graph": use_graph})

            if use_graph:
                logger.info("Knowledge Graph expansion triggered. Fetching entity relationships...")
                try:
                    with start_span(
                        "graph-expansion",
                        input_payload={"query": query},
                        metadata={"component": "graph-retrieval"},
                    ) as graph_span:
                        related_entities = graph_retriever.get_related_entities(query)
                        if related_entities:
                            expanded_query = query + " " + " ".join(related_entities)
                            logger.info(f"Expanded search query with entities: \"{expanded_query}\"")
                            graph_results = retriever.retrieve(expanded_query, top_k=max(3, top_k // 2), collection_name=collection_name)

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
                    logger.error(f"Graph Retrieval expansion failed: {exc}", exc_info=True)
            else:
                logger.info("Knowledge Graph expansion skipped by router agent.")

        all_results = base_results + graph_results
        seen = set()
        unique_results = []

        for doc in all_results:
            key = (doc["content"], doc.get("page"))
            if key not in seen:
                seen.add(key)
                unique_results.append(doc)

        logger.info(f"Deduplicated candidates count: {len(unique_results)}")

        if reranker is not None and unique_results:
            logger.info(f"[Step 4/5] Reranking {len(unique_results)} candidates using CrossEncoder (top_k={rerank_top_k or 10})...")
            try:
                with start_span(
                    "rerank-documents",
                    input_payload={"candidate_count": len(unique_results)},
                    metadata={"component": "reranker"},
                ) as rerank_span:
                    unique_results = reranker.rerank(query, unique_results, top_k=rerank_top_k or 10)
                    if rerank_span is not None:
                        rerank_span.update(output={"result_count": len(unique_results)})
            except Exception as exc:
                logger.error(f"Reranking failed: {exc}. Proceeding with un-reranked candidates.", exc_info=True)

        # Cap results to top 10 candidates
        unique_results = unique_results[:10]

        if not unique_results:
            logger.warning(f"NO RELEVANT CONTEXT FOUND! Retriever returned 0 matching documents for query: '{query}'")
            if root_span is not None:
                root_span.update(output={"answer": "No relevant context found.", "confidence": 0.0})
            return {"answer": "No relevant context found.", "sources": [], "confidence": 0.0}

        logger.info(f"[Step 5/5] Invoking Groq LLM ('{settings.groq_model}') with style '{style_key}' and {len(unique_results)} context chunks...")

        context = "\n\n".join([doc["content"] for doc in unique_results])
        
        # Enforce 8000 token (~28,000 characters) maximum input context limit
        MAX_INPUT_CHARS = 28000
        if len(context) > MAX_INPUT_CHARS:
            logger.info(f"Input context size ({len(context)} chars) exceeds 8000 token limit. Truncating context.")
            context = context[:MAX_INPUT_CHARS] + "\n...[Context truncated to 8000 token limit]..."

        sources = [
            {"chapter": doc.get("chapter"), "page": doc.get("page"), "score": doc.get("score")}
            for doc in unique_results[:5]
        ]
        confidence = normalize_confidence(max([doc["score"] for doc in unique_results]))

        formatted_history = ""
        if history:
            formatted_history = "\n".join(
                [f"{m['role'].capitalize()}: {m['content']}" for m in history[-4:]]
            )

        prompt = build_prompt(style_key, query, context, formatted_history)



        with start_span(
            "generate-answer",
            input_payload={"query": query, "context_doc_count": len(unique_results)},
            metadata={"component": "llm"},
            as_type="generation",
        ) as generation_span:
            try:
                callback_handler = get_langfuse_langchain_handler()
                if callback_handler is not None:
                    response = llm.invoke(
                        prompt,
                        config={"callbacks": [callback_handler], "run_name": "rag-answer-generation"},
                    )
                else:
                    response = llm.invoke(prompt)
            except Exception as exc:
                logger.error(f"Groq LLM invocation with callback failed ({exc}). Retrying without callbacks...", exc_info=True)
                try:
                    response = llm.invoke(prompt)
                except Exception as direct_exc:
                    logger.error(f"Groq LLM direct invocation also failed: {direct_exc}", exc_info=True)
                    raise direct_exc

            if generation_span is not None:
                generation_span.update(output={"answer_preview": response.content[:400], "confidence": confidence})

        total_elapsed = time.time() - start_time
        logger.info(f"--- RAG Pipeline Execution Completed in {total_elapsed:.2f}s ---")
        logger.info(f"Confidence score: {confidence:.4f} | Source count: {len(sources)}")

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