import os
import gradio as gr

# 1. Import your existing FastAPI application from main.py
try:
    from main import app as fastapi_app
except ImportError:
    from model.main import app as fastapi_app

# 2. Create a lightweight Gradio interface required by Hugging Face Spaces
with gr.Blocks(title="MicroGPT RAG API Engine") as demo:
    gr.Markdown("# ⚡ MicroGPT RAG API Engine")
    gr.Markdown(
        "This Space runs the **MicroGPT FastAPI RAG Backend Engine**.\n\n"
        "- **API Endpoint**: `POST /query`\n"
        "- **Status**: Active & Serving Inferences"
    )

# 3. Mount your existing FastAPI application into Gradio
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")

# 4. Launch Gradio's managed server event loop for HF Space lifecycle
if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    demo.launch(server_name="0.0.0.0", server_port=port, allowed_paths=["*"])
