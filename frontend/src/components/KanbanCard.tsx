import { useState } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  themeColor?: string;
};

export const KanbanCard = ({ card, onDelete, themeColor = "#b88ba0" }: KanbanCardProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
            {card.title}
          </h4>
          <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
            {card.details}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-transparent text-lg font-bold leading-none text-[var(--gray-text)] transition hover:bg-rose-50 hover:text-rose-500"
          aria-label={`Delete ${card.title}`}
          title="Remove card"
        >
          &minus;
        </button>
      </div>

      {showDeleteModal && createPortal(
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm cursor-default"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-xl font-bold text-[#8a4e66]">Delete Card</h3>
            <p className="mb-6 text-sm text-[#a38c95]">
              Are you sure you want to delete "{card.title}"? This cannot be undone!
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-[#a38c95] transition hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete(card.id);
                }}
                className="rounded-2xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 active:scale-95 shadow-md"
                style={{ backgroundColor: themeColor }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </article>
  );
};
