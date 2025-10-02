import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
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

export const CardItem = ({ card, year, month }: { card: Card; year: number; month: number }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(card.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card, year, month },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { mutateAsync: updateTitle } = useUpdateCardTitle(year, month, card.id);
  const { mutate: updateStatus } = useUpdateCardStatus(year, month, card.id);
  const { mutate: deleteCard, isPending: isDeleting } = useDeleteCard(year, month, card.id);

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
      className={cn(
        "group rounded-lg border border-border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring",
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
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-2">
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
              disabled={isDeleting}
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
