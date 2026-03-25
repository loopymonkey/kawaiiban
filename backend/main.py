import os
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Mount frontend build directory if it exists
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")
if os.path.exists(frontend_dir):
    # Try mounting the standard NextJS static asset folder directly under _next/
    next_static_dir = os.path.join(frontend_dir, "_next")
    if os.path.exists(next_static_dir):
        app.mount("/_next", StaticFiles(directory=next_static_dir), name="next")
        
    @app.get("/{full_path:path}")
    async def serve_static(full_path: str):
        # Serve the exact file if it maps directly to something (like favicon.ico)
        file_path = os.path.join(frontend_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise serve index.html
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        return HTMLResponse(content="<h1>Index not found</h1>", status_code=404)
else:
    @app.get("/")
    def read_root():
        return HTMLResponse(content="<h1>Hello World from FastAPI Backend (Frontend not built)</h1>", status_code=200)
