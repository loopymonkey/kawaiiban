import os
import json
from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

try:
    from backend import database
except ModuleNotFoundError:
    import database  # type: ignore
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load `.env` from the project root if running locally outside docker 
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

openai_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", "dummy"),
)

app = FastAPI()

# --- Database Dependencies & Schemas ---

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class BoardStateSchema(BaseModel):
    state_json: Dict[str, Any]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    username: str
    prompt: str
    history: List[ChatMessage] = []

# --- System prompt builder ---

SYSTEM_PROMPT = """You are Kawaii-Ban, a friendly assistant for a Kanban project management board.
You help users manage their board by creating, moving, and deleting cards, or renaming columns.

The current board state is provided below as JSON. Each column has an id, title, and cardIds array.
The cards object maps card ids to {{id, title, details}}.

When a user asks you to make a change, apply it yourself and return the full updated board in your response.
If no board change is needed, return null for board.

You MUST respond ONLY with valid JSON matching this exact schema:
{{
  "message": "<your friendly reply to the user>",
  "board": null or the complete updated board JSON with the same structure as the input
}}

When creating new cards, generate a unique id like "card-<random6chars>".
Current board state:
{board_json}
"""

# --- API Routes ---

api_router = APIRouter()

@api_router.get("/board/{username}")
def get_board(username: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == username).first()
    if not user:
        user = database.User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
        
    board = db.query(database.Board).filter(database.Board.user_id == user.id).first()
    if not board:
        initial_state = {
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
                {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
                {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
                {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
                {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]}
            ],
            "cards": {
                "card-1": {"id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes with impact statements and metrics."},
                "card-2": {"id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback."},
                "card-3": {"id": "card-3", "title": "Prototype analytics view", "details": "Sketch initial dashboard layout and key drill-downs."},
                "card-4": {"id": "card-4", "title": "Refine status language", "details": "Standardize column labels and tone across the board."},
                "card-5": {"id": "card-5", "title": "Design card layout", "details": "Add hierarchy and spacing for scanning dense lists."},
                "card-6": {"id": "card-6", "title": "QA micro-interactions", "details": "Verify hover, focus, and loading states."},
                "card-7": {"id": "card-7", "title": "Ship marketing page", "details": "Final copy approved and asset pack delivered."},
                "card-8": {"id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally."}
            }
        }
        board = database.Board(user_id=user.id, state_json=initial_state)
        db.add(board)
        db.commit()
        db.refresh(board)
        
    return {"state_json": board.state_json}

@api_router.put("/board/{username}")
def update_board(username: str, board_req: BoardStateSchema, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    board = db.query(database.Board).filter(database.Board.user_id == user.id).first()
    if not board:
        board = database.Board(user_id=user.id, state_json=board_req.state_json)
        db.add(board)
    else:
        board.state_json = board_req.state_json
        
    db.commit()
    return {"status": "success"}

@api_router.get("/ai_ping")
async def ai_ping():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key == "your_key_here" or api_key == "dummy":
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY environment variable not set or invalid in .env")
        
    try:
        completion = await openai_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": "say hello"}],
            max_tokens=20,
        )
        return {
            "status": "ok",
            "message": completion.choices[0].message.content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai_chat")
async def ai_chat(req: ChatRequest, db: Session = Depends(get_db)):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key == "your_key_here" or api_key == "dummy":
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")

    # Fetch live board state
    user = db.query(database.User).filter(database.User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    board = db.query(database.Board).filter(database.Board.user_id == user.id).first()
    board_json = json.dumps(board.state_json, indent=2) if board else "{}"

    system_prompt = SYSTEM_PROMPT.format(board_json=board_json)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.prompt})

    try:
        completion = await openai_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
        )
        raw = completion.choices[0].message.content

        if not raw:
            raise ValueError("Model returned empty response. Try rephrasing your message.")

        # Strip markdown code fences if the model wraps JSON in ```json ... ```
        stripped = raw.strip()
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(stripped)
        reply_message = result.get("message", "")
        updated_board = result.get("board", None)

        # If LLM returned a board mutation, persist it
        if updated_board and board:
            board.state_json = updated_board
            db.commit()

        return {"message": reply_message, "board": updated_board}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON — try rephrasing your request")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router, prefix="/api")


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
