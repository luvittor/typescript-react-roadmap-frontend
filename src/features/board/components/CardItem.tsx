import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import { getNextStatus, getStatusLabel } from "../../../utils/status";
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

  const handleStatusToggle = () => updateStatus(getNextStatus(card.status));

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
      {...attributes}
      aria-busy={isSaving}
      aria-label={`Roadmap card: ${card.title || "Untitled"}`}
      aria-disabled={isMoving || isSaving}
      role="group"
      tabIndex={isMoving || isSaving ? -1 : 0}
      onPointerDown={(event) => {
        listeners?.onPointerDown?.(event);
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget) listeners?.onKeyDown?.(event);
      }}
      className={cn(
        "group touch-none rounded-md border border-border/80 bg-card p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-ring",
        !isMoving && !isSaving && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div data-testid="card-main-row" className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={card.status === "not_started" ? false : card.status === "in_progress" ? "mixed" : true}
          className={cn(
            "inline-flex h-4 w-4 flex-none items-center justify-center overflow-hidden rounded-[4px] border border-foreground/80 bg-background text-white transition hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            card.status !== "not_started" && "border-sky-500 bg-sky-500",
          )}
          onClick={handleStatusToggle}
          disabled={isSaving}
          aria-label={`Status: ${getStatusLabel(card.status)}. Activate to mark ${getStatusLabel(getNextStatus(card.status))}`}
          title={getStatusLabel(card.status)}
        >
          {card.status === "in_progress" && <span className="h-0.5 w-2 rounded-full bg-white" aria-hidden="true" />}
          {card.status === "completed" && <Check className="h-3 w-3" aria-hidden="true" />}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form
              className="w-full"
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
              className="w-full truncate text-left text-sm font-medium"
              onClick={() => setIsEditing(true)}
              disabled={isSaving}
            >
              {card.title || "Untitled"}
            </button>
          )}
        </div>

        {isSaving ? (
          <span className="inline-flex h-8 w-8 flex-none items-center justify-center text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" role="status" aria-label="Saving card" />
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="card-control h-8 w-8 flex-none px-2 text-muted-foreground hover:text-destructive"
            onClick={() => deleteCard()}
            aria-label="Delete card"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
