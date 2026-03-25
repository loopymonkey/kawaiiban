import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const mockInitialBoard = {
  cards: {},
  columns: [
    { id: "col-todo", title: "To Do", cardIds: [] },
    { id: "col-in-progress", title: "In Progress", cardIds: [] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
    { id: "col-published", title: "Published", cardIds: [] }
  ]
};

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({ state_json: mockInitialBoard })
  })) as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("KanbanBoard", () => {
  it("renders five columns", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
  });

  it("renames a column", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds and removes a card", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
    
    const column = getFirstColumn();
    const addButton = within(column).getByRole("button", {
      name: /\+/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(within(column).getByRole("button", { name: /add card/i }));

    expect(within(column).getByText("New card")).toBeInTheDocument();

    const deleteButton = within(column).getByRole("button", {
      name: /Delete New card/i,
    });
    await userEvent.click(deleteButton);
    
    const confirmDeleteButton = await screen.findByRole("button", { name: "Delete" });
    await userEvent.click(confirmDeleteButton);

    expect(within(column).queryByText("New card")).not.toBeInTheDocument();
  });
});
