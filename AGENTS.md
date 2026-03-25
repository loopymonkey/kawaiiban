# Kawaii-Ban

A cute kawaii-themed Kanban project management app with an AI assistant sidebar.

## Status

MVP complete. Parts 1–11 implemented and working.

## Features

- Login (username/password) or Google OAuth
- Create new user accounts with email + password
- 5-column Kawaii-themed Kanban board with peeking animal mascots
- Drag-and-drop cards, add/delete/rename
- Board state persisted to SQLite across reloads, isolated per user
- AI Assistant sidebar powered by OpenRouter (`openai/gpt-oss-120b`)
- AI can create, move, delete cards and rename columns; changes apply instantly

## Tech Stack

- Frontend: NextJS (App Router, static export)
- Backend: Python FastAPI, serves the static NextJS build at `/`
- Database: SQLite via SQLAlchemy (JSON blob per user)
- AI: OpenRouter API via the `openai` Python client
- Package manager: `uv` (Python)
- Packaging: Docker (single container)

## Running Locally

Requires Docker and a `.env` file in the project root:

```
OPENROUTER_API_KEY=sk-or-v1-...
SECRET_KEY=<random string for JWT signing>

# Optional: enables Google Sign-In
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Then run the appropriate start script:

```bash
./scripts/start_mac.sh    # Mac / Linux
scripts\start_pc.bat      # Windows
```

App available at `http://localhost:8000`.

## Project Structure

```
backend/          FastAPI app, SQLAlchemy models, pytest tests
frontend/         NextJS app (src/app, src/components, src/lib)
docs/             PLAN.md, DB_SCHEMA.md
scripts/          start/stop scripts for Mac, Linux, Windows
Dockerfile        Multi-stage build: Node (frontend) + Python (backend)
.env              API keys (gitignored, never committed)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account (username, email, password) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/google` | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/board/{username}` | Fetch board state (auth required) |
| PUT | `/api/board/{username}` | Save board state (auth required) |
| GET | `/api/ai_ping` | Test OpenRouter connectivity |
| POST | `/api/ai_chat` | AI chat with live board context (auth required) |

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991`
- Dark Navy: `#032147`
- Gray Text: `#888888`

## Coding Standards

1. Use latest versions of libraries and idiomatic approaches
2. Keep it simple - never over-engineer, no unnecessary defensive programming
3. Be concise. Keep README minimal. No emojis ever
4. When hitting issues, identify root cause before fixing. Prove with evidence first

## Working Documentation

See `docs/PLAN.md` for the full completed plan and `docs/DB_SCHEMA.md` for the database schema.