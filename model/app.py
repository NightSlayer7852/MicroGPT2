import spaces
import os
import uvicorn
import gradio as gr

try:
    from main import app as fastapi_app, execute_rag_pipeline, llm
    from config import settings
except ImportError:
    from model.main import app as fastapi_app, execute_rag_pipeline, llm
    from model.config import settings


@spaces.GPU(duration=60)
def predict_gradio(query: str) -> str:
    if not query or not query.strip():
        return "Please enter a valid question."

    try:
        components = fastapi_app.state.components

        res = execute_rag_pipeline(
            query.strip(),
            components.retriever,
            llm,
            None,
            settings.rag_top_k,
            components.reranker,
            settings.rerank_top_k,
            components.graph_retriever,
            {"trace_name": "gradio-space-ui"},
            None,
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
    title="MicroGPT RAG API Engine",
    description="MicroGPT RAG system with ZeroGPU inference."
)


app = gr.mount_gradio_app(
    fastapi_app,
    demo,
    path="/ui"
)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)