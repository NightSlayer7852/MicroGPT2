"""Tiny router agent: decides whether a query needs knowledge-graph expansion.

This uses the same building block a full ReAct agent uses to pick an action
-- binding a tool to the LLM and letting it decide whether to call it -- just
for a single yes/no decision instead of a multi-step loop. Graph expansion
costs an extra LLM call (entity extraction) plus a Neo4j round trip, so it's
only worth paying for when the question is actually about relationships
between components.
"""
from __future__ import annotations

from langchain_core.tools import tool

try:
    from .logger import get_logger
except ImportError:
    from logger import get_logger

logger = get_logger("microgpt.agent")


@tool
def search_knowledge_graph(query: str) -> str:
    """Look up how components/entities in the query relate to each other.

    Use this only when the question asks about relationships, dependencies,
    or connections between multiple named components (e.g. "what depends on
    X", "how does X connect to Y"). Do not use it for simple factual lookups
    that a single passage can answer.
    """
    return query


def should_expand_with_graph(query: str) -> bool:
    try:
        try:
            from .rag import llm  # local import: rag.py builds this agent, so import lazily to avoid a cycle
        except ImportError:
            from rag import llm

        router = llm.bind_tools([search_knowledge_graph])
        response = router.invoke(
            "Decide whether answering this question requires looking up entity "
            f"relationships in the knowledge graph.\n\nQuestion: {query}"
        )
        use_graph = bool(response.tool_calls)
        logger.info(f"Router Agent decision for query '{query}': use_graph={use_graph}")
        return use_graph
    except Exception as exc:
        logger.error(f"Router Agent evaluation failed for query '{query}': {exc}. Defaulting to use_graph=False.", exc_info=True)
        return False

