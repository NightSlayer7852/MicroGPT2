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


app = gr.mount_gradio_app(
    fastapi_app,
    demo,
    path="/"
)