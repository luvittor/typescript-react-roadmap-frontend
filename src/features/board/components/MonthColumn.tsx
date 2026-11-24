import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useMemo, type ReactNode } from "react";

import { Skeleton } from "../../../components/ui/skeleton";
import { formatMonthLabel } from "../../../utils/date";
import type { Card, Column } from "../types";
import { CardItem } from "./CardItem";
import { AddCardForm } from "./AddCardForm";
import { ColumnSortableContext } from "../dnd";

const loadingSkeletonKeys = ["month-card-1", "month-card-2", "month-card-3"] as const;

export const MonthColumn = ({
  column,
  cards,
  year,
  month,
  isLoading,
  isMoving,
  movingCardId,
  isCurrent,
  isError,
  onRetry,
  onCollapse,
}: {
  column?: Column | null;
  cards: Card[];
  year: number;
  month: number;
  isLoading: boolean;
  isMoving: boolean;
  movingCardId: number | null;
  isCurrent: boolean;
  isError: boolean;
  onRetry: () => void;
  onCollapse: () => void;
}) => {
  const monthLabel = useMemo(() => formatMonthLabel({ year, month }), [year, month]);
  const { active, over } = useDndContext();
  const overData = over?.data.current as { year?: number; month?: number } | undefined;
  const isTarget = Boolean(active && overData?.year === year && overData.month === month);
  const { setNodeRef } = useDroppable({
    id: `drop-${year}-${month}`,
    data: { year, month, columnId: column?.id },
  });
  let monthContent: ReactNode;

  if (isError) {
    monthContent = (
      <div className="rounded-md border border-destructive/40 p-3 text-sm text-muted-foreground">
        <p>Could not load this month.</p>
        <button type="button" onClick={onRetry} className="mt-1 underline">Try again</button>
      </div>
    );
  } else if (isLoading) {
    monthContent = (
      <div className="space-y-3">
        {loadingSkeletonKeys.map((skeletonKey) => (
          <Skeleton key={skeletonKey} className="h-20 w-full" />
        ))}
      </div>
    );
  } else {
    monthContent = (
      <ColumnSortableContext columnId={{ year, month }} cards={cards}>
        <ol className="min-h-20 space-y-2" aria-live="polite">
          {cards.length !== 0 && cards
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((card) => (
              <li key={card.id}>
                <CardItem card={card} year={year} month={month} isMoving={isMoving} isBeingMoved={movingCardId === card.id} />
              </li>
            ))}
        </ol>
      </ColumnSortableContext>
    );
  }

  return (
    <section
      ref={setNodeRef}
      id={isCurrent ? "roadmap-current-month" : undefined}
      aria-labelledby={`column-${year}-${month}`}
      className={`flex w-[min(340px,86vw)] flex-none self-stretch flex-col gap-3 border-r border-border/70 px-4 py-4 transition-colors sm:px-5 ${isTarget ? "bg-primary/10 ring-2 ring-inset ring-primary" : isCurrent ? "bg-accent/30" : "bg-transparent"}`}
    >
      <div className="flex min-h-12 items-center">
        <h2 id={`column-${year}-${month}`} className={`text-3xl font-semibold tracking-tight sm:text-4xl ${isCurrent ? "text-primary" : ""}`}>
          <button type="button" onClick={onCollapse} aria-label={`Collapse ${monthLabel}`} className="rounded-sm text-left hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {monthLabel}
          </button>
        </h2>
      </div>
      {monthContent}
      <AddCardForm
        column={column}
        year={year}
        month={month}
        nextOrder={cards.reduce((lastOrder, card) => Math.max(lastOrder, card.order), 0) + 1}
      />
    </section>
  );
};
