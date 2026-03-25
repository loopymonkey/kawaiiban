# Database Schema Proposal: Kawaii-Ban

For the Kawaii-Ban MVP, we will use a **hybrid JSON-Relational approach** powered by **SQLite** using `SQLAlchemy`.

## Core Rationale
The primary goal is frictionless integration with the Front-End state and the upcoming OpenRouter AI Agent. 

If we split cards and columns into dozens of rigid SQL rows, the LLM has to issue complex CRUD commands. By storing the board payload as a unified JSON object, the backend simply passes the current JSON to the LLM, and the LLM safely mutates and returns a modified JSON structure representing the new board.

## Schema Layout

### 1. `users` Table
This satisfies the requirement for future multi-user support. For the MVP, it will house our hard-coded mock user.

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Auto-increment |
| `username` | TEXT | Unique |
| `password_hash` | TEXT | For future auth expansion |
| `created_at` | DATETIME | Timestamp |

### 2. `boards` Table
Satisfies the limitation: "1 Kanban board per signed in user".

| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | INTEGER | Primary Key, Auto-increment |
| `user_id` | INTEGER | Foreign Key referencing `users(id)`, Unique |
| `state_json`| TEXT | Serialized JSON of the Next.js `BoardData` interface |
| `updated_at`| DATETIME| Timestamp (updated on every move) |

---

## Agent-LLM Mapping Approach

1. **Context Hydration**: Whenever the user talks to the AI in the sidebar, the backend fetches `boards.state_json` for their `user_id` and injects it into the LLM's system prompt so the AI "sees" the entire board instantly.
2. **Structured Outputs**: We will map the OpenRouter API to strictly enforce the Next.js `BoardData` Typescript Interface schema.
3. **Atomic Writes**: If the AI decides to edit/move/create cards, it simply returns the newly morphed JSON object. The backend atomically runs `UPDATE boards SET state_json = ? WHERE user_id = ?`, and the NextJS frontend immediately receives the new payload.

This drastically cuts down backend verbosity and eliminates traditional API race conditions!
