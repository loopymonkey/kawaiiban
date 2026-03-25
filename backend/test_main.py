from fastapi.testclient import TestClient
from main import app, get_db
import database

client = TestClient(app)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
database.Base.metadata.create_all(bind=engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

def test_get_board_initializes_empty_board():
    response = client.get("/api/board/testuser")
    assert response.status_code == 200
    data = response.json()
    assert "state_json" in data
    # The initial state is defined in main.py
    assert "columns" in data["state_json"]
    assert "cards" in data["state_json"]

def test_update_board():
    # first fetch to ensure user is created
    client.get("/api/board/testuser2")
    
    new_state = {
        "cards": {"card-test": {"id": "card-test", "title": "Test Title", "details": "Test Details"}},
        "columns": [{"id": "col-1", "title": "Test Column", "cardIds": ["card-test"]}]
    }
    
    response = client.put("/api/board/testuser2", json={"state_json": new_state})
    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    
    # fetch again to verify update
    response2 = client.get("/api/board/testuser2")
    data = response2.json()
    assert data["state_json"]["cards"]["card-test"]["title"] == "Test Title"

# --- Part 9: ai_chat tests ---

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

def _make_mock_completion(content: dict):
    """Helper to build a mock ChatCompletion response."""
    mock_msg = MagicMock()
    mock_msg.content = json.dumps(content)
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    return mock_completion

def test_ai_chat_returns_message_no_board_change():
    """LLM returns message with null board — no DB mutation."""
    client.get("/api/board/chatuser")  # ensure user + board exist

    llm_response = {"message": "Hello there!", "board": None}

    with patch("main.openai_client") as mock_client, \
         patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_make_mock_completion(llm_response)
        )
        response = client.post("/api/ai_chat", json={
            "username": "chatuser",
            "prompt": "Just say hello",
            "history": []
        })

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello there!"
    assert data["board"] is None

def test_ai_chat_board_mutation_persisted():
    """LLM returns updated board — verify it is saved to the DB."""
    client.get("/api/board/mutationuser")  # ensure user + board exist

    updated_board = {
        "columns": [{"id": "col-backlog", "title": "Backlog", "cardIds": ["card-new"]}],
        "cards": {"card-new": {"id": "card-new", "title": "Write docs", "details": ""}}
    }
    llm_response = {"message": "I created a card called Write docs.", "board": updated_board}

    with patch("main.openai_client") as mock_client, \
         patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        mock_client.chat.completions.create = AsyncMock(
            return_value=_make_mock_completion(llm_response)
        )
        response = client.post("/api/ai_chat", json={
            "username": "mutationuser",
            "prompt": "Create a card called Write docs in Backlog",
            "history": []
        })

    assert response.status_code == 200
    data = response.json()
    assert "Write docs" in data["message"]
    assert data["board"] is not None
    assert data["board"]["cards"]["card-new"]["title"] == "Write docs"

    # Verify board was persisted to DB
    persisted = client.get("/api/board/mutationuser").json()
    assert persisted["state_json"]["cards"]["card-new"]["title"] == "Write docs"

def test_ai_chat_injects_board_state_into_prompt():
    """Verify the system prompt sent to the LLM contains the live board JSON."""
    client.get("/api/board/promptuser")  # ensure board exists

    captured_messages = []
    llm_response = {"message": "ok", "board": None}

    async def capture_create(**kwargs):
        captured_messages.extend(kwargs.get("messages", []))
        return _make_mock_completion(llm_response)

    with patch("main.openai_client") as mock_client, \
         patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}):
        mock_client.chat.completions.create = capture_create
        client.post("/api/ai_chat", json={
            "username": "promptuser",
            "prompt": "What columns do I have?",
            "history": []
        })

    system_msg = next(m for m in captured_messages if m["role"] == "system")
    # Board JSON should be embedded in the system prompt
    assert "col-backlog" in system_msg["content"]
    assert "columns" in system_msg["content"]
