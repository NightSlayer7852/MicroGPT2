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

if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    demo.launch(server_name="0.0.0.0", server_port=port)
