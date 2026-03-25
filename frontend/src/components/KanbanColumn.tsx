import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  index?: number;
};

const THEMES = [
  { animal: "mouse", color: "#eAf2fa", border: "#b3c1d9", img: "/mouse.png" },
  { animal: "cat", color: "#fef4dd", border: "#e8cc87", img: "/cat.png" },
  { animal: "dog", color: "#eaf8eb", border: "#a1c2a4", img: "/dog.png" },
  { animal: "bear", color: "#fae7eb", border: "#d4a9a5", img: "/bear.png" },
  { animal: "dragon", color: "#f4ebfc", border: "#b9a6d9", img: "/dragon.png" },
];

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
  index = 0,
}: KanbanColumnProps) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const theme = THEMES[index % THEMES.length];

  return (
    <div className="relative pt-16 group">
      {/* Peeking Animal */}
      <div className="absolute top-0 left-0 w-full flex justify-center h-24 overflow-visible pointer-events-none z-0">
        <img 
          src={theme.img} 
          alt={theme.animal} 
          className="h-[120px] w-auto origin-bottom translate-y-0 transition-transform duration-300 group-hover:-translate-y-4 mix-blend-multiply"
        />
      </div>

      <section
        ref={setNodeRef}
        className={clsx(
          "relative min-h-[520px] flex flex-col rounded-3xl border-4 p-4 shadow-lg transition-all z-10",
          isOver && "ring-4 ring-[#b88ba0] shadow-xl scale-[1.02]"
        )}
        style={{ backgroundColor: theme.color, borderColor: theme.border }}
        data-testid={`column-${column.id}`}
      >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <div className="flex items-center gap-3">
            <div className="h-2 w-10 rounded-full" style={{ backgroundColor: theme.border }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
              {cards.length} cards
            </span>
            <button 
              onClick={() => setIsAddingCard(true)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-lg font-medium text-[var(--navy-dark)] transition hover:bg-black/10 hover:scale-105"
            >
              +
            </button>
          </div>
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            className="mt-3 w-full bg-transparent font-display text-lg font-semibold text-[var(--navy-dark)] outline-none"
            aria-label="Column title"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        {isAddingCard && (
          <NewCardForm
            onAdd={(title, details) => {
              onAddCard(column.id, title, details);
              setIsAddingCard(false);
            }}
            onCancel={() => setIsAddingCard(false)}
            buttonColor={theme.border}
          />
        )}
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              themeColor={theme.border}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && !isAddingCard && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Drop a card here
          </div>
        )}
      </div>
      </section>
    </div>
  );
};
