from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import json
import pytest

from main import app, get_db, get_current_user
import database

# --- In-memory test DB ---

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
database.Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth override: returns a pre-created test user ---

def _get_or_create_test_user(username: str) -> database.User:
    db = TestingSessionLocal()
    try:
        user = db.query(database.User).filter(database.User.username == username).first()
        if not user:
            user = database.User(username=username, email=f"{username}@test.com")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    finally:
        db.close()

_default_test_user = None

def override_get_current_user():
    global _default_test_user
    if _default_test_user is None:
        _default_test_user = _get_or_create_test_user("testuser")
    return _default_test_user

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

# --- Board tests ---

def test_get_board_initializes_default_board():
    response = client.get("/api/board/testuser")
    assert response.status_code == 200
    data = response.json()
    assert "state_json" in data
    assert "columns" in data["state_json"]
    assert "cards" in data["state_json"]

def test_update_board():
    new_state = {
        "cards": {"card-test": {"id": "card-test", "title": "Test Title", "details": ""}},
        "columns": [{"id": "col-1", "title": "Test Column", "cardIds": ["card-test"]}],
    }
    response = client.put("/api/board/testuser", json={"state_json": new_state})
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    response2 = client.get("/api/board/testuser")
    assert response2.json()["state_json"]["cards"]["card-test"]["title"] == "Test Title"

def test_board_forbidden_for_other_user():
    # testuser is authenticated; accessing another username should be 403
    response = client.get("/api/board/otheruser")
    assert response.status_code == 403

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

# --- AI chat tests ---

def _make_mock_completion(content: dict):
    mock_msg = MagicMock()
    mock_msg.content = json.dumps(content)
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    return mock_completion

def test_ai_chat_returns_message_no_board_change():
    llm_response = {"message": "Hello there!", "board": None}
    with patch("main.openai_client") as mock_client, \
         patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        mock_client.chat.completions.create = AsyncMock(return_value=_make_mock_completion(llm_response))
        response = client.post("/api/ai_chat", json={"prompt": "Just say hello", "history": []})

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello there!"
    assert data["board"] is None

def test_ai_chat_board_mutation_persisted():
    updated_board = {
        "columns": [{"id": "col-backlog", "title": "Backlog", "cardIds": ["card-new"]}],
        "cards": {"card-new": {"id": "card-new", "title": "Write docs", "details": ""}},
    }
    llm_response = {"message": "I created a card called Write docs.", "board": updated_board}
    with patch("main.openai_client") as mock_client, \
         patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        mock_client.chat.completions.create = AsyncMock(return_value=_make_mock_completion(llm_response))
        response = client.post("/api/ai_chat", json={"prompt": "Create a card called Write docs", "history": []})

    assert response.status_code == 200
    data = response.json()
    assert data["board"] is not None
    assert data["board"]["cards"]["card-new"]["title"] == "Write docs"

    # Verify persisted
    persisted = client.get("/api/board/testuser").json()
    assert persisted["state_json"]["cards"]["card-new"]["title"] == "Write docs"

def test_ai_chat_injects_board_state_into_prompt():
    captured_messages = []
    llm_response = {"message": "ok", "board": None}

    async def capture_create(**kwargs):
        captured_messages.extend(kwargs.get("messages", []))
        return _make_mock_completion(llm_response)

    with patch("main.openai_client") as mock_client, \
         patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        mock_client.chat.completions.create = capture_create
        client.post("/api/ai_chat", json={"prompt": "What columns do I have?", "history": []})

    system_msg = next(m for m in captured_messages if m["role"] == "system")
    assert "col-backlog" in system_msg["content"]
    assert "columns" in system_msg["content"]
