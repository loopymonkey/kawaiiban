"use client";

import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { createId, initialData, moveCard, type BoardData } from "@/lib/kanban";

type KanbanBoardProps = {
  onBoardReady?: (updater: (board: BoardData) => void) => void;
};

export const KanbanBoard = ({ onBoardReady }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData>(() => initialData);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Expose a way for the parent to push AI board updates in
  useEffect(() => {
    if (onBoardReady) {
      onBoardReady((newBoard: BoardData) => {
        setBoard(newBoard);
      });
    }
  }, [onBoardReady]);

  useEffect(() => {
    fetch("/api/board/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.state_json) {
          setBoard(data.state_json);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load board", err);
        setIsLoading(false);
      });
  }, []);

  const saveBoard = (newBoard: BoardData) => {
    setBoard(newBoard);
    fetch("/api/board/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state_json: newBoard }),
    }).catch(console.error);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const newColumns = moveCard(board.columns, active.id as string, over.id as string);
    saveBoard({ ...board, columns: newColumns });
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    const newColumns = board.columns.map((column) =>
      column.id === columnId ? { ...column, title } : column
    );
    saveBoard({ ...board, columns: newColumns });
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    const newBoard = {
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: board.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: [id, ...column.cardIds] }
          : column
      ),
    };
    saveBoard(newBoard);
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    const newBoard = {
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== cardId),
            }
          : column
      ),
    };
    saveBoard(newBoard);
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl font-bold text-[#b88ba0] animate-pulse">Loading Kawaii-Ban...</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="hidden">
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column, index) => (
              <KanbanColumn
                key={column.id}
                column={column}
                index={index}
                cards={column.cardIds.map((cardId) => board.cards[cardId])}
                onRename={handleRenameColumn}
                onAddCard={handleAddCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </section>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
