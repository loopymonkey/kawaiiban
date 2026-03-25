# High level steps for project

## Part 1: Plan (Current)
- [x] Read AGENTS.md and current docs/PLAN.md
- [x] Create frontend/AGENTS.md describing the existing code
- [x] Rewrite docs/PLAN.md with detailed steps, tests, and success criteria
- [ ] Ensure the user checks and approves the plan
**Tests & Success Criteria**
- Success: User approves the enriched plan.

## Part 2: Scaffolding
- [x] Create `Dockerfile` and `docker-compose.yml` (if needed) for the NextJS frontend statically wrapped in a Python FastAPI backend.
- [x] Create `backend/` directory and configure dependency management using `uv`.
- [x] Create a simple FastAPI app exposing a "hello world" route serving basic static HTML at `/`.
- [x] Create cross-platform start/stop scripts in `scripts/` (e.g. `start_mac.sh`, `stop_mac.sh`).
**Tests & Success Criteria**
- Test: Run the server using our newly created start scripts. `curl http://localhost:8000` (or appropriate port).
- Success: The Docker container spins up and serves the "hello world" HTML page.

## Part 3: Add in Frontend
- [x] Update NextJS configuration to build static files (`output: 'export'`).
- [x] Update FastAPI backend to mount and serve the built static NextJS assets from `frontend/out/` at `/`.
- [x] Write a backend integration test to verify the index HTML and static assets are correctly served.
**Tests & Success Criteria**
- Test: Build NextJS static assets and launch the Python backend, visit `http://localhost:8000/`.
- Success: The app loads the exact same React demo currently seen via the dev server. No missing 404 styles.

## Part 4: Add in a fake user sign in experience
- [x] Update the NextJS app to show a basic login page at root instead of the board if not authenticated.
- [x] Add state checking for mock credentials ("user" and "password").
- [x] On successful entry, transition to the Kanban board and add a "Log out" button.
- [x] Write component tests for login screen interactions and unauthenticated redirect.
**Tests & Success Criteria**
- Test: Refresh the page in a clean browser state. User is shown login screen and cannot bypass without the exact credentials.
- Success: Entering 'user' and 'password' opens the Kanban view, and logging out reliably clears state.

## Part 5: Database modeling
- [ ] Propose a local SQLite database schema for the Kanban board inside `docs/DB_SCHEMA.md` or similar documentation.
- [ ] Determine how to save data as JSON per the requirements (e.g., a simple `id`, `user_id`, `board_json` structure vs full relational).
- [ ] Document the database approach for agent-LLM mapping.
**Tests & Success Criteria**
- Test: User successfully reviews `docs/DB_SCHEMA.md`.
- Success: User signs off on the DB approach.

## Part 6: Backend API
- [ ] Initialize SQLite DB securely on FastAPI startup if it doesn't already exist.
- [ ] Provide API endpoints for Kanban interactions:
  - `GET /api/board/{username}` - Returns the serialized board JSON for the current mock user.
  - `POST/PUT /api/board/{username}` - Updates the Kanban state.
- [ ] Write backend unit tests using `pytest` and FastAPI's `TestClient` to verify data serialization/deserialization logic.
**Tests & Success Criteria**
- Test: Run `pytest` pointing to an in-memory test db executing CRUD operations.
- Success: Endpoints correctly save to the SQLite file logic without crashes or 500s.

## Part 7: Frontend + Backend
- [ ] Update NextJS `lib/kanban.ts` or components to fetch initial board state from `GET /api/board/user` upon mounting.
- [ ] Add save handlers so that dropping a card or changing column names issues a `POST/PUT /api/board/user` request.
- [ ] Create end-to-end tests or mock component tests representing full integration logic.
**Tests & Success Criteria**
- Test: Open app, move card, refresh browser.
- Success: The Kanban board preserves state after page reloads, definitively proving backend integration.

## Part 8: AI connectivity
- [ ] Add `OPENROUTER_API_KEY` processing logic to the backend via `.env`.
- [ ] Build a simple `/api/ai_ping` test endpoint that sends a hardcoded system prompt ("say 'Hello!'").
- [ ] Make the request strictly using model `openai/gpt-oss-120b`.
**Tests & Success Criteria**
- Test: Make a request to the newly created endpoint.
- Success: Response yields valid text directly from OpenRouter, confirming API key mapping.

## Part 9: AI with Kanban Context
- [ ] Implement an endpoint `/api/ai_chat` taking `{ prompt: string, history: Array }`.
- [ ] Fetch the live Kanban JSON data and inject it dynamically into the OpenRouter system prompt.
- [ ] Configure Structured Outputs (JSON Schema format) so that the LLM responds with a user message AND optional JSON board modifications in a strict unified schema.
- [ ] Add backend unit tests to verify prompt formatting and extraction logic for the structured output.
**Tests & Success Criteria**
- Test: Trigger the unit test which mocks OpenRouter responses.
- Success: The backend validates the structural integrity of the returned LLM plan successfully.

## Part 10: Sidebar AI Chat Widget
- [ ] Create a beautiful sliding or sticky Sidebar widget inside the NextJS view for AI Chat.
- [ ] Wire user chat submission to `/api/ai_chat` and display a typing indicator while processing.
- [ ] Read the structured output updates; if the LLM action changes the board state, mutate frontend React state and (if desired) autosave to DB.
**Tests & Success Criteria**
- Test: Write "Please create a card named 'Write documentation'" in the AI chat.
- Success: The chat message responds properly AND a new card instantly renders in the primary view without browser reload.