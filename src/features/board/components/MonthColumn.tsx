import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";

import { Skeleton } from "../../../components/ui/skeleton";
import { formatMonthLabel } from "../../../utils/date";
import type { Card, Column } from "../types";
import { CardItem } from "./CardItem";
import { AddCardForm } from "./AddCardForm";
import { ColumnSortableContext } from "../dnd";

export const MonthColumn = ({
  column,
  cards,
  year,
  month,
  isLoading,
  isMoving,
  movingCardId,
}: {
  column?: Column;
  cards: Card[];
  year: number;
  month: number;
  isLoading: boolean;
  isMoving: boolean;
  movingCardId: number | null;
}) => {
  const monthLabel = useMemo(() => formatMonthLabel({ year, month }), [year, month]);
  const { active, over } = useDndContext();
  const overData = over?.data.current as { year?: number; month?: number } | undefined;
  const isTarget = Boolean(active && overData?.year === year && overData.month === month);
  const { setNodeRef } = useDroppable({
    id: `drop-${year}-${month}`,
    data: { year, month, columnId: column?.id },
  });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${year}-${month}`}
      className={`flex w-[min(340px,86vw)] flex-none self-stretch flex-col gap-3 border-r border-border/70 px-4 py-4 transition-colors sm:px-5 ${isTarget ? "bg-primary/10 ring-2 ring-inset ring-primary" : "bg-transparent"}`}
    >
      <div className="flex min-h-12 items-center">
        <h2 id={`column-${year}-${month}`} className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {monthLabel}
        </h2>
      </div>
      {column && <AddCardForm column={column} year={year} month={month} />}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <ColumnSortableContext columnId={{ year, month }} cards={cards}>
          <ol className="min-h-20 space-y-2" role="list" aria-live="polite">
            {cards.length === 0 ? (
              <li>
                <div className="rounded-md border border-dashed border-border/80 px-3 py-2.5 text-center text-xs text-muted-foreground">
                  Drop card here
                </div>
              </li>
            ) : (
              cards
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((card) => (
                  <li key={card.id}>
                    <CardItem card={card} year={year} month={month} isMoving={isMoving} isBeingMoved={movingCardId === card.id} />
                  </li>
                ))
            )}
          </ol>
        </ColumnSortableContext>
      )}
    </section>
  );
};
