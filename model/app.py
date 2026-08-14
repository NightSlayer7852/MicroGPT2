import os
import uvicorn
import gradio as gr

try:
    from main import app as fastapi_app
except ImportError:
    from model.main import app as fastapi_app

with gr.Blocks(title="MicroGPT RAG API Engine") as demo:
    gr.Markdown("# ⚡ MicroGPT RAG API Engine")
    gr.Markdown(
        "This Space runs the **MicroGPT FastAPI RAG Backend Engine**.\n\n"
        "- **API Endpoint**: `POST /query`\n"
        "- **Status**: Active & Serving Inferences"
    )

# Mount the Gradio app onto the existing FastAPI app
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)
