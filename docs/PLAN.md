# Kawaii-Ban Project Plan

## Status: MVP Complete

All 10 parts of the plan have been implemented and are working end-to-end.

---

## Part 1: Plan
- [x] Read AGENTS.md and current docs/PLAN.md
- [x] Create frontend/AGENTS.md describing the existing code
- [x] Rewrite docs/PLAN.md with detailed steps, tests, and success criteria

## Part 2: Scaffolding
- [x] Dockerfile for NextJS static frontend + Python FastAPI backend
- [x] `backend/` with `uv` dependency management
- [x] FastAPI app serving static HTML at `/`
- [x] Cross-platform start/stop scripts in `scripts/`

## Part 3: Frontend Integration
- [x] NextJS configured with `output: 'export'` for static build
- [x] FastAPI mounts and serves `frontend/out/` at `/`
- [x] Backend integration tests for static asset serving

## Part 4: Login
- [x] Login page shown at root when unauthenticated
- [x] Mock credentials: `user` / `password`
- [x] Logout button clears session
- [x] Component tests for login interactions

## Part 5: Database Modeling
- [x] SQLite schema documented in `docs/DB_SCHEMA.md`
- [x] Hybrid JSON-relational design: board state stored as a JSON blob per user
- [x] Schema optimized for LLM board manipulation

## Part 6: Backend API
- [x] SQLite auto-initialized on startup via SQLAlchemy
- [x] `GET /api/board/{username}` - fetch board state (creates default on first visit)
- [x] `PUT /api/board/{username}` - persist board state
- [x] `GET /api/ai_ping` - test OpenRouter connectivity
- [x] `POST /api/ai_chat` - AI chat with live board context injection
- [x] pytest suite with in-memory SQLite (5 tests, all passing)

## Part 7: Frontend + Backend Integration
- [x] KanbanBoard fetches initial state from backend on mount
- [x] All mutations (drag, add, delete, rename) auto-save via PUT
- [x] Vitest component tests mock fetch and verify async board loading

## Part 8: AI Connectivity
- [x] `OPENROUTER_API_KEY` read from `.env` via python-dotenv
- [x] OpenRouter client configured with `openai/gpt-oss-120b`
- [x] `/api/ai_ping` endpoint confirms live API key

## Part 9: AI with Kanban Context
- [x] `/api/ai_chat` injects live board JSON into system prompt
- [x] LLM responds with `{ message, board }` — board is null if no changes
- [x] Board mutations automatically persisted to SQLite
- [x] Null-safe content handling + markdown code-fence stripping for robustness

## Part 10: AI Chat Sidebar
- [x] Sliding `AiSidebar` panel with backdrop, themed to match app palette
- [x] Bouncing dot typing indicator while AI is thinking
- [x] Full conversation history passed to API each turn
- [x] Board updates from AI instantly reflected in Kanban view (no reload)
- [x] `*.db` added to `.gitignore`; `.env` was never committed

## Part 11: Multi-User Auth & Google Login
- [x] `POST /api/auth/register` - username, email, password; returns JWT
- [x] `POST /api/auth/login` - username or email + password; returns 7-day JWT
- [x] `GET /api/auth/google` - initiates Google OAuth flow
- [x] `GET /api/auth/google/callback` - exchanges code, creates/finds user, redirects with JWT
- [x] Board and AI chat endpoints protected with Bearer token auth
- [x] `frontend/src/lib/auth.ts` - getAuth/setAuth/clearAuth/authedFetch utility
- [x] `RegisterForm.tsx` - new registration screen
- [x] `LoginForm.tsx` - updated with real API auth + Google button + register link
- [x] `page.tsx` - JWT auth state, Google redirect handling, login/register toggle

---

## Known Limitations (by design for MVP)
- Single hardcoded user (`user` / `password`)
- One board per user
- Runs locally via Docker only
- No real authentication or session tokens

