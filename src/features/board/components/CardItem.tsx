import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import { getNextStatus, getStatusColor, getStatusLabel } from "../../../utils/status";
import type { Card } from "../types";
import {
  useDeleteCard,
  useUpdateCardStatus,
  useUpdateCardTitle,
} from "../hooks/useBoard";

export const CardItem = ({ card, year, month, isMoving, isBeingMoved }: { card: Card; year: number; month: number; isMoving: boolean; isBeingMoved: boolean }) => {
  const isCreating = card.id < 0 || Boolean(card.pendingCreation);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(card.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { mutateAsync: updateTitle, isPending: isUpdatingTitle } = useUpdateCardTitle(year, month, card.id);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateCardStatus(year, month, card.id);
  const { mutate: deleteCard, isPending: isDeleting } = useDeleteCard(year, month, card.id);
  const isSaving = isCreating || isBeingMoved || isUpdatingTitle || isUpdatingStatus || isDeleting;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: isMoving || isSaving,
    data: { card, year, month },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setValue(card.title);
  }, [card.title]);

  const handleStatusToggle = () => {
    const next = getNextStatus(card.status);
    updateStatus(next);
  };

  const handleSubmit = async () => {
    if (!value.trim() || value === card.title) {
      setIsEditing(false);
      setValue(card.title);
      return;
    }
    await updateTitle(value.trim());
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-busy={isSaving}
      onPointerDown={(event) => {
        const target = event.target;
        if (target instanceof Element && !target.closest("button, input, textarea, select, a, [contenteditable='true'], [role='button']")) {
          listeners?.onPointerDown?.(event);
        }
      }}
      className={cn(
        "group touch-none rounded-md border border-border/80 bg-card p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-ring",
        !isMoving && !isSaving && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground transition hover:text-foreground"
          aria-label="Drag card"
          {...attributes}
          {...listeners}
          disabled={isMoving || isSaving}
        >
          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" role="status" aria-label="Saving card" /> : <GripVertical className="h-4 w-4" />}
        </button>

        <div className="flex-1 space-y-1.5">
          {isEditing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <Input
                ref={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onBlur={() => void handleSubmit()}
                aria-label="Edit card title"
              />
            </form>
          ) : (
            <button
              type="button"
              className="w-full text-left text-sm font-medium"
              onClick={() => setIsEditing(true)}
              disabled={isSaving}
            >
              {card.title || "Untitled"}
            </button>
          )}

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold transition",
                getStatusColor(card.status),
              )}
              onClick={handleStatusToggle}
              disabled={isSaving}
              aria-label={`Mark as ${getStatusLabel(getNextStatus(card.status))}`}
            >
              {getStatusLabel(card.status)}
            </button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
              onClick={() => deleteCard()}
              disabled={isSaving}
              aria-label="Delete card"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
