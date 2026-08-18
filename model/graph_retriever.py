from __future__ import annotations

import os
from typing import List

try:
    from .logger import get_logger
    from .tracing import get_langfuse_langchain_handler
except ImportError:
    from logger import get_logger
    from tracing import get_langfuse_langchain_handler

from neo4j import GraphDatabase

logger = get_logger("microgpt.graph_retriever")


class GraphRetriever:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI")
        self.user = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.database = os.getenv("NEO4J_DATABASE", "neo4j")

        if not self.uri:
            logger.warning("NEO4J_URI environment variable is not set. Neo4j operations will fail if invoked.")

        logger.info(f"Initializing Neo4j Graph Database driver (URI: '{self.uri}', DB: '{self.database}')...")
        try:
            self.driver = GraphDatabase.driver(self.uri or "", auth=(self.user, self.password), connection_timeout=5.0)
            logger.info("Neo4j driver instantiated successfully.")
        except Exception as exc:
            logger.error(f"Failed to create Neo4j driver: {exc}", exc_info=True)
            raise

    def close(self):
        try:
            if hasattr(self, "driver") and self.driver:
                self.driver.close()
                logger.info("Neo4j driver closed successfully.")
        except Exception as exc:
            logger.warning(f"Error closing Neo4j driver: {exc}")

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
            logger.error(f"Failed to extract entities via LLM for query '{query}': {exc}", exc_info=True)
            entities = []

        entities_set = list(set(entities))
        logger.info(f"Extracted entities from query: {entities_set}")
        return entities_set

    def get_related_entities(self, query: str, limit: int = 5) -> List[str]:
        entities = self.extract_entities(query)
        if not entities:
            logger.info("No entities extracted for graph search.")
            return []

        related = set()

        try:
            with self.driver.session(database=self.database) as session:
                for entity in entities:
                    try:
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
                                logger.debug(f"Found related entity for '{entity}': '{related_name}'")
                                related.add(related_name)
                    except Exception as cypher_exc:
                        logger.error(f"Cypher query error for entity '{entity}': {cypher_exc}", exc_info=True)
        except Exception as session_exc:
            logger.error(f"Failed Neo4j session execution: {session_exc}", exc_info=True)

        final_related = list(related)
        logger.info(f"Final related entities to expand query: {final_related}")
        return final_related

