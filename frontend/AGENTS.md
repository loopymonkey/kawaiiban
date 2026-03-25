# The Project Management MVP web app - Frontend

This NextJS frontend application provides the UI for the Kanban board and its related features. It serves as the foundation for our eventual full-stack application.

## Frameworks & Technologies
- **NextJS (App Router)**: The application uses the Next.js App Router paradigm (`src/app/`)
- **React**: For UI components and hooks
- **Tailwind CSS**: For all styling, using the predefined brand color scheme:
  - Accent Yellow: `#ecad0a`
  - Blue Primary: `#209dd7`
  - Purple Secondary: `#753991`
  - Dark Navy: `#032147`
  - Gray Text: `#888888`
- **Testing**: 
  - `vitest` for unit/component testing (`src/test/`, `src/lib/kanban.test.ts`, `src/components/*.test.tsx`)
  - `playwright` configured for e2e testing

## Architecture
- `src/app/`
  - `page.tsx`: The main landing page displaying the Kanban board demo.
  - `layout.tsx`: The global Next.js application layout.
  - `globals.css`: Tailwind imports and global style definitions.
- `src/components/`
  - `KanbanBoard.tsx`: The main Kanban board interface handling drag-and-drop contexts and overall state.
  - `KanbanColumn.tsx`: An individual column within the board.
  - `KanbanCard.tsx` / `KanbanCardPreview.tsx`: The task cards inside the columns.
  - `NewCardForm.tsx`: UI for creating new tasks.
- `src/lib/`
  - `kanban.ts`: Core data structures and helper utilities for managing the board state. Currently mock-data capable.

## Current State
- The frontend is a static proof of concept.
- It is currently set up as a NextJS Dev Server application, but it will need to be built as a static export to be served by the FastAPI backend in the next phase.
