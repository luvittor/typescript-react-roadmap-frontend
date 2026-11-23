import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Ellipsis, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import { getNextStatus, getStatusLabel } from "../../../utils/status";
import type { Card, CardColor } from "../types";
import {
  useDeleteCard,
  useUpdateCardStatus,
  useUpdateCardTitle,
  useUpdateCardColor,
} from "../hooks/useBoard";

const cardColors: { value: CardColor; label: string; className: string }[] = [
  { value: "slate", label: "Gray", className: "bg-slate-400" },
  { value: "teal", label: "Teal", className: "bg-teal-500" },
  { value: "green", label: "Green", className: "bg-green-500" },
  { value: "yellow", label: "Yellow", className: "bg-yellow-400" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
];

export const CardItem = ({ card, year, month, isMoving, isBeingMoved, preview = false }: { card: Card; year: number; month: number; isMoving: boolean; isBeingMoved: boolean; preview?: boolean }) => {
  const isCreating = card.id < 0 || Boolean(card.pendingCreation);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [value, setValue] = useState(card.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statusCheckboxRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  const { mutateAsync: updateTitle, isPending: isUpdatingTitle } = useUpdateCardTitle(year, month, card.id);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateCardStatus(year, month, card.id);
  const { mutate: updateColor, isPending: isUpdatingColor } = useUpdateCardColor(year, month, card.id);
  const { mutate: deleteCard, isPending: isDeleting } = useDeleteCard(year, month, card.id);
  const isSaving = isCreating || isBeingMoved || isUpdatingTitle || isUpdatingStatus || isUpdatingColor || isDeleting;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: preview || isMoving || isSaving,
    data: { card, year, month },
  });
  const sortableAttributes = { ...attributes, role: undefined };
  const isStatusInProgress = card.status === "in_progress";
  const isStatusCompleted = card.status === "completed";

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

  useEffect(() => {
    if (statusCheckboxRef.current) {
      statusCheckboxRef.current.indeterminate = isStatusInProgress;
    }
  }, [isStatusInProgress]);

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
    <fieldset
      ref={preview ? undefined : setNodeRef}
      style={style}
      {...(preview ? {} : sortableAttributes)}
      {...(preview ? {} : listeners)}
      role={undefined}
      aria-busy={isSaving}
      aria-label={`Roadmap card: ${card.title || "Untitled"}`}
      aria-disabled={isMoving || isSaving}
      tabIndex={preview || isMoving || isSaving ? -1 : 0}
      className={cn(
        "group touch-none rounded-md border border-border/80 bg-card p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-ring",
        ({ slate: "border-l-4 border-l-slate-400", teal: "border-l-4 border-l-teal-500", green: "border-l-4 border-l-green-500", yellow: "border-l-4 border-l-yellow-400", blue: "border-l-4 border-l-blue-500" } as Record<string, string>)[card.color ?? "slate"],
        !isMoving && !isSaving && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <div data-testid="card-main-row" className="flex items-center gap-2">
        <label className="relative inline-flex h-4 w-4 flex-none items-center justify-center">
          <input
            ref={statusCheckboxRef}
            type="checkbox"
            checked={isStatusCompleted}
            onChange={handleStatusToggle}
            disabled={isSaving}
            aria-label={`Status: ${getStatusLabel(card.status)}. Activate to mark ${getStatusLabel(getNextStatus(card.status))}`}
            title={getStatusLabel(card.status)}
            className={cn(
              "h-4 w-4 appearance-none rounded-[4px] border border-foreground/80 bg-background transition hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring checked:border-sky-500 checked:bg-sky-500 indeterminate:border-sky-500 indeterminate:bg-sky-500",
            )}
          />
          {isStatusInProgress && <span className="pointer-events-none absolute h-0.5 w-2 rounded-full bg-white" aria-hidden="true" />}
          {isStatusCompleted && <Check className="pointer-events-none absolute h-3 w-3 text-white" aria-hidden="true" />}
        </label>

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
          <div
            className="relative flex-none"
            ref={menuRef}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="card-control h-8 w-8 flex-none px-2 text-muted-foreground"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label="Card options"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
            {isMenuOpen && (
              <div role="menu" aria-label="Card options" className="absolute right-0 top-full z-20 mt-1 flex items-center gap-1 rounded-md border border-border bg-card p-2 shadow-lg">
                {cardColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    role="menuitemradio"
                    aria-label={`Set card color to ${color.label}`}
                    aria-checked={(card.color ?? "slate") === color.value}
                    title={color.label}
                    onClick={() => {
                      updateColor(color.value);
                      setIsMenuOpen(false);
                    }}
                    className={cn("h-4 w-4 rounded-full ring-offset-1 transition-transform hover:scale-125 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", color.className, (card.color ?? "slate") === color.value && "ring-2 ring-foreground")}
                  />
                ))}
                <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Delete card"
                  onClick={() => {
                    setIsMenuOpen(false);
                    deleteCard();
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
};
