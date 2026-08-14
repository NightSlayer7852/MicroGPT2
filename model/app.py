import spaces
import os
import gradio as gr

try:
    from config import settings
    from rag import build_components, llm, rag
except ImportError:
    from model.config import settings
    from model.rag import build_components, llm, rag

# Initialize RAG components directly for Gradio Space
components = build_components(include_graph=True)


@spaces.GPU(duration=60)
def predict_gradio(query: str) -> str:
    if not query or not query.strip():
        return "Please enter a valid question."

    try:
        res = rag(
            query.strip(),
            components.retriever,
            llm,
            history=None,
            top_k=settings.rag_top_k,
            return_context=False,
            reranker=components.reranker,
            rerank_top_k=settings.rerank_top_k,
            graph_retriever=components.graph_retriever,
            tracing_context={"trace_name": "gradio-space-ui"},
            collection_name=None,
        )
        return res.get("answer", "No answer generated.")
    except Exception as exc:
        return f"Error executing RAG query: {exc}"


demo = gr.Interface(
    fn=predict_gradio,
    inputs=gr.Textbox(
        lines=3,
        placeholder="Ask a question about STM32 microcontrollers..."
    ),
    outputs="text",
    title="MicroGPT RAG Engine",
    description="MicroGPT RAG System running live on Hugging Face ZeroGPU."
)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    demo.launch(server_name="0.0.0.0", server_port=port)