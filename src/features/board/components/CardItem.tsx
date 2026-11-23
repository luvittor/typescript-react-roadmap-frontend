import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, Ellipsis, LoaderCircle, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";
import { getNextStatus, getStatusLabel } from "../../../utils/status";
import type { Card, CardColor } from "../types";
import { boardApi } from "../api";
import { cardsKey, useCreateCard, useEnsureMonthColumn } from "../hooks/useBoard";
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
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const isCreating = card.id < 0 || Boolean(card.pendingCreation);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPreparingDuplicate, setIsPreparingDuplicate] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const value = isEditing ? draftTitle : card.title;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statusCheckboxRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const duplicateInProgressRef = useRef(false);
  const queryClient = useQueryClient();

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
  const { mutateAsync: ensureMonthColumn, isPending: isEnsuringMonth } = useEnsureMonthColumn();
  const { mutateAsync: createCard, isPending: isDuplicating } = useCreateCard(nextMonth.year, nextMonth.month, {
    success: "Card duplicated",
    error: "Could not duplicate card",
  });
  const isSaving = isCreating || isBeingMoved || isUpdatingTitle || isUpdatingStatus || isUpdatingColor || isDeleting || isEnsuringMonth || isPreparingDuplicate || isDuplicating;

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
    if (statusCheckboxRef.current) {
      statusCheckboxRef.current.indeterminate = isStatusInProgress;
    }
  }, [isStatusInProgress]);

  const handleStatusToggle = () => updateStatus(getNextStatus(card.status));

  const handleDuplicate = async () => {
    if (duplicateInProgressRef.current) return;
    duplicateInProgressRef.current = true;
    setIsPreparingDuplicate(true);

    try {
      const column = await ensureMonthColumn(nextMonth);
      const monthCards = await queryClient.fetchQuery({
        queryKey: cardsKey(nextMonth.year, nextMonth.month),
        queryFn: () => boardApi.getCards(nextMonth.year, nextMonth.month),
      });
      const nextOrder = Math.max(0, ...monthCards.cards.map((currentCard) => currentCard.order)) + 1;
      const payload: { column_id: number; order: number; title: string; color: CardColor } = {
        column_id: column.id,
        order: nextOrder,
        title: card.title,
        color: card.color ?? "slate",
      };
      setIsMenuOpen(false);
      await createCard(payload).catch(() => undefined);
    } catch {
      toast.error("Could not duplicate card");
    } finally {
      duplicateInProgressRef.current = false;
      setIsPreparingDuplicate(false);
    }
  };

  const handleSubmit = async () => {
    if (!value.trim() || value === card.title) {
      setIsEditing(false);
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
      onKeyDown={(event) => {
        if (!preview && event.target === event.currentTarget) {
          listeners?.onKeyDown?.(event);
        }
      }}
      role={undefined}
      aria-busy={isSaving}
      aria-label={`Roadmap card: ${card.title || "Untitled"}`}
      aria-disabled={isMoving || isSaving}
      tabIndex={preview || isMoving || isSaving ? -1 : 0}
      className={cn(
        "group min-w-0 w-full touch-none rounded-md border border-border/80 bg-card p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-ring",
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
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => void handleSubmit()}
                aria-label="Edit card title"
              />
            </form>
          ) : (
            <button
              type="button"
              className="w-full whitespace-normal break-words text-left text-sm font-medium"
              onClick={() => {
                setDraftTitle(card.title);
                setIsEditing(true);
              }}
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
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Duplicate card to next month"
                  title="Duplicate card to next month"
                  onClick={() => void handleDuplicate()}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <span role="separator" aria-orientation="vertical" className="mx-1 h-5 w-px bg-border" />
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
                <span role="separator" aria-orientation="vertical" className="mx-1 h-5 w-px bg-border" />
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
