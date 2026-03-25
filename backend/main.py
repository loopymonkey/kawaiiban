import os
import json
import urllib.parse
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, APIRouter, Header
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from jose import JWTError, jwt
import bcrypt
import httpx

try:
    from backend import database
except ModuleNotFoundError:
    import database  # type: ignore

from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# --- Auth config ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

openai_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", "dummy"),
)

app = FastAPI()
database.init_db()

# --- Helpers ---

def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(database.User).filter(database.User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- Pydantic schemas ---

class BoardStateSchema(BaseModel):
    state_json: Dict[str, Any]

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str  # accepts username or email
    password: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    prompt: str
    history: List[ChatMessage] = []

# --- System prompt ---

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

# Auth endpoints

@api_router.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(database.User).filter(database.User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(database.User).filter(database.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = database.User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    return {"token": create_token(req.username), "username": req.username}

@api_router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == req.username).first()
    if not user:
        user = db.query(database.User).filter(database.User.email == req.username).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(user.username), "username": user.username}

@api_router.get("/auth/google")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")
    params = urllib.parse.urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")

@api_router.get("/auth/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    async with httpx.AsyncClient() as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        })
        token_data = token_resp.json()
        if "access_token" not in token_data:
            raise HTTPException(status_code=400, detail="Google token exchange failed")

        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo = userinfo_resp.json()

    google_id = userinfo["sub"]
    email = userinfo.get("email", "")
    display_name = userinfo.get("name", email.split("@")[0])

    user = db.query(database.User).filter(database.User.google_id == google_id).first()
    if not user:
        user = db.query(database.User).filter(database.User.email == email).first()
        if user:
            user.google_id = google_id
        else:
            base = display_name.lower().replace(" ", "_")[:20]
            username = base
            counter = 1
            while db.query(database.User).filter(database.User.username == username).first():
                username = f"{base}_{counter}"
                counter += 1
            user = database.User(username=username, email=email, google_id=google_id)
            db.add(user)
        db.commit()
        db.refresh(user)

    token = create_token(user.username)
    return RedirectResponse(f"/?token={token}&username={urllib.parse.quote(user.username)}")

# Board endpoints (require auth)

def _get_or_create_board(username: str, db: Session):
    user = db.query(database.User).filter(database.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    board = db.query(database.Board).filter(database.Board.user_id == user.id).first()
    if not board:
        initial_state = {
            "columns": [
                {"id": "col-backlog", "title": "Backlog", "cardIds": ["card-1", "card-2"]},
                {"id": "col-discovery", "title": "Discovery", "cardIds": ["card-3"]},
                {"id": "col-progress", "title": "In Progress", "cardIds": ["card-4", "card-5"]},
                {"id": "col-review", "title": "Review", "cardIds": ["card-6"]},
                {"id": "col-done", "title": "Done", "cardIds": ["card-7", "card-8"]},
            ],
            "cards": {
                "card-1": {"id": "card-1", "title": "Align roadmap themes", "details": "Draft quarterly themes with impact statements and metrics."},
                "card-2": {"id": "card-2", "title": "Gather customer signals", "details": "Review support tags, sales notes, and churn feedback."},
                "card-3": {"id": "card-3", "title": "Prototype analytics view", "details": "Sketch initial dashboard layout and key drill-downs."},
                "card-4": {"id": "card-4", "title": "Refine status language", "details": "Standardize column labels and tone across the board."},
                "card-5": {"id": "card-5", "title": "Design card layout", "details": "Add hierarchy and spacing for scanning dense lists."},
                "card-6": {"id": "card-6", "title": "QA micro-interactions", "details": "Verify hover, focus, and loading states."},
                "card-7": {"id": "card-7", "title": "Ship marketing page", "details": "Final copy approved and asset pack delivered."},
                "card-8": {"id": "card-8", "title": "Close onboarding sprint", "details": "Document release notes and share internally."},
            },
        }
        board = database.Board(user_id=user.id, state_json=initial_state)
        db.add(board)
        db.commit()
        db.refresh(board)
    return board

@api_router.get("/board/{username}")
def get_board(username: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.username != username:
        raise HTTPException(status_code=403, detail="Forbidden")
    board = _get_or_create_board(username, db)
    return {"state_json": board.state_json}

@api_router.put("/board/{username}")
def update_board(username: str, board_req: BoardStateSchema, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.username != username:
        raise HTTPException(status_code=403, detail="Forbidden")
    board = _get_or_create_board(username, db)
    board.state_json = board_req.state_json
    db.commit()
    return {"status": "success"}

# AI endpoints

@api_router.get("/ai_ping")
async def ai_ping():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key in ("your_key_here", "dummy"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")
    try:
        completion = await openai_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": "say hello"}],
            max_tokens=20,
        )
        return {"status": "ok", "message": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai_chat")
async def ai_chat(req: ChatRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key in ("your_key_here", "dummy"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")

    board = db.query(database.Board).filter(database.Board.user_id == current_user.id).first()
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

        stripped = raw.strip()
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        result = json.loads(stripped)
        reply_message = result.get("message", "")
        updated_board = result.get("board", None)

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

# Serve static frontend

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")
if os.path.exists(frontend_dir):
    next_static_dir = os.path.join(frontend_dir, "_next")
    if os.path.exists(next_static_dir):
        app.mount("/_next", StaticFiles(directory=next_static_dir), name="next")

    @app.get("/{full_path:path}")
    async def serve_static(full_path: str):
        file_path = os.path.join(frontend_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return HTMLResponse(content="<h1>Index not found</h1>", status_code=404)
else:
    @app.get("/")
    def read_root():
        return HTMLResponse(content="<h1>Hello World from FastAPI Backend (Frontend not built)</h1>", status_code=200)
