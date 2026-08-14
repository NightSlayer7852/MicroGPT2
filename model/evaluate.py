"""RAGAS evaluation over questions listed in test.txt.

Usage:
    python -m backend.evaluate
"""
from __future__ import annotations

from pathlib import Path
from typing import List, Optional

try:
    from .config import settings
    from .rag import build_components, llm, rag
except ImportError:
    from config import settings
    from rag import build_components, llm, rag


def load_examples(file_path: str = "test.txt") -> List[tuple[str, Optional[str]]]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Missing evaluation file: {path}")

    examples: List[tuple[str, Optional[str]]] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        parts = [part.strip() for part in line.split("|")]
        question = parts[0]
        reference_answer = parts[1] if len(parts) > 1 and parts[1] else None
        examples.append((question, reference_answer))

    if not examples:
        raise ValueError("No evaluation examples found in test.txt")

    return examples


def evaluate_with_ragas() -> None:
    try:
        from datasets import Dataset
        from ragas import evaluate
        from ragas.metrics import AnswerRelevancy, Faithfulness
    except Exception as exc:
        raise RuntimeError("RAGAS evaluation requires the 'ragas' and 'datasets' packages.") from exc

    components = build_components(include_graph=False)
    examples = load_examples()

    questions: List[str] = []
    answers: List[str] = []
    contexts: List[List[str]] = []
    reference_answers: List[Optional[str]] = []

    for question, reference_answer in examples:
        response = rag(
            question,
            components.retriever,
            llm,
            top_k=settings.rag_top_k,
            return_context=True,
            reranker=components.reranker,
            rerank_top_k=settings.rerank_top_k,
        )

        questions.append(question)
        answers.append(response["answer"])
        contexts.append([response.get("context", "")])
        reference_answers.append(reference_answer)

        print("-" * 80)
        print(f"Question: {question}")
        print(f"Confidence: {response['confidence']:.4f}")

    dataset_payload = {"question": questions, "answer": answers, "contexts": contexts}
    if any(reference_answers):
        dataset_payload["ground_truth"] = [reference or "" for reference in reference_answers]

    dataset = Dataset.from_dict(dataset_payload)
    result = evaluate(dataset, metrics=[Faithfulness(), AnswerRelevancy()])

    print("=" * 80)
    print("RAGAS evaluation summary")
    print(result)


if __name__ == "__main__":
    evaluate_with_ragas()
