import { useDroppable } from "@dnd-kit/core";
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
}: {
  column?: Column;
  cards: Card[];
  year: number;
  month: number;
  isLoading: boolean;
}) => {
  const monthLabel = useMemo(() => formatMonthLabel({ year, month }), [year, month]);
  const { setNodeRef } = useDroppable({
    id: `drop-${year}-${month}`,
    data: { year, month, columnId: column?.id },
  });

  return (
    <section
      aria-labelledby={`column-${year}-${month}`}
      className="flex min-w-[260px] flex-col gap-3 rounded-xl bg-muted/40 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 id={`column-${year}-${month}`} className="text-sm font-semibold uppercase tracking-wide">
          {monthLabel}
        </h2>
        {column && <AddCardForm column={column} year={year} month={month} />}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <ColumnSortableContext columnId={{ year, month }} cards={cards}>
          <ol ref={setNodeRef} className="space-y-3" role="list" aria-live="polite">
            {cards.length === 0 ? (
              <li>
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Drop card here
                </div>
              </li>
            ) : (
              cards
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((card) => (
                  <li key={card.id}>
                    <CardItem card={card} year={year} month={month} />
                  </li>
                ))
            )}
          </ol>
        </ColumnSortableContext>
      )}
    </section>
  );
};
