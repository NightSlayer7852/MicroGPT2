import os
import gradio as gr

try:
    from main import app as fastapi_app
except ImportError:
    from model.main import app as fastapi_app

demo = gr.Interface(
    fn=lambda query: "MicroGPT FastAPI RAG Engine is running live! Query endpoint active at /query",
    inputs=gr.Textbox(lines=2, placeholder="Ask a question about STM32..."),
    outputs="text",
    title="MicroGPT RAG API Engine",
    description="FastAPI Backend for MicroGPT RAG System. Accessible at /query endpoint."
)

# Mount Gradio interface onto FastAPI app
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")

# Hugging Face Space runner loads 'demo' as top-level application
demo = app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)
