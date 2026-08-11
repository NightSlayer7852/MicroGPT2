from __future__ import annotations

import os
from typing import List

try:
    from .tracing import get_langfuse_langchain_handler
except ImportError:
    from tracing import get_langfuse_langchain_handler
from neo4j import GraphDatabase


class GraphRetriever:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI")
        self.user = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.database = os.getenv("NEO4J_DATABASE", "neo4j")

        self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password), connection_timeout=5.0)

    def close(self):
        self.driver.close()

    def extract_entities(self, query: str) -> List[str]:
        # Imported lazily to avoid a circular import: rag.py builds the
        # GraphRetriever, and the GraphRetriever needs rag's llm.
        try:
            from .rag import llm
        except ImportError:
            from rag import llm

        prompt = f"""
Extract the most important technical entities, components, or keywords from the following query.
Return ONLY a comma-separated list of the extracted entities. Do not include any other text, markdown, or explanation.

Query: {query}
"""
        try:
            callback_handler = get_langfuse_langchain_handler()
            if callback_handler is not None:
                response = llm.invoke(prompt, config={"callbacks": [callback_handler], "run_name": "graph-entity-extraction"})
            else:
                response = llm.invoke(prompt)
            content = response.content.strip().replace("`", "").replace('"', "").replace("'", "")
            entities = [entity.strip() for entity in content.split(",") if entity.strip()]
        except Exception as exc:
            print(f"[Graph Debug] Failed to extract entities via LLM: {exc}")
            entities = []

        entities_set = list(set(entities))
        print(f"[Graph Debug] Extracted entities from query: {entities_set}")
        return entities_set

    def get_related_entities(self, query: str, limit: int = 5) -> List[str]:
        entities = self.extract_entities(query)
        related = set()

        with self.driver.session(database=self.database) as session:
            for entity in entities:
                result = session.run(
                    """
                    MATCH (a)
                    WHERE toLower(a.id) CONTAINS toLower($id)
                    MATCH (a)-[r]->(b)
                    RETURN coalesce(b.id, b.id) AS related
                    LIMIT $limit
                    """,
                    id=entity,
                    limit=limit,
                )
                for record in result:
                    related_name = record.get("related")
                    if related_name:
                        print(f"[Graph Debug] Found related entity for '{entity}': {related_name}")
                        related.add(related_name)

        final_related = list(related)
        print(f"[Graph Debug] Final related entities to expand query: {final_related}")
        return final_related
