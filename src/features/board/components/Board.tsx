import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useMemo, useRef, useState } from "react";
import { QueryClient, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cardsKey, createCardMutationKey, useMonthCards, useMoveCard } from "../hooks/useBoard";
import { getConsecutiveMonths, type MonthKey } from "../../../utils/date";
import type { Card, ColumnCardsResponse } from "../types";
import { MonthColumn } from "./MonthColumn";
import { DragOverlay, useBoardSensors, reorderWithinList } from "../dnd";

const OverlayCard = ({ card }: { card: Card }) => (
  <div className="w-[240px] rounded-lg border border-border bg-card p-3 shadow-lg">
    <p className="text-sm font-medium">{card.title}</p>
    <p className="text-xs text-muted-foreground capitalize">{card.status.replace("_", " ")}</p>
  </div>
);

export const createHandleDragEnd = ({
  queryClient,
  moveCard,
  toastImpl = toast,
}: {
  queryClient: QueryClient;
  moveCard: (payload: { id: number; year: number; month: number; order: number }) => Promise<void>;
  toastImpl?: typeof toast;
}) =>
  async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { card: Card; year: number; month: number } | undefined;
    const overData = over.data.current as { card?: Card; year?: number; month?: number } | undefined;

    if (!activeData) return;

    const fromKey = cardsKey(activeData.year, activeData.month);
    const targetYear = overData?.year ?? activeData.year;
    const targetMonth = overData?.month ?? activeData.month;
    const toKey = cardsKey(targetYear, targetMonth);
    const cancellation = Promise.all([
      queryClient.cancelQueries({ queryKey: fromKey, exact: true }),
      queryClient.cancelQueries({ queryKey: toKey, exact: true }),
    ]);
    const fromData = queryClient.getQueryData<ColumnCardsResponse>(fromKey);
    if (!fromData) return;
    const toData = queryClient.getQueryData<ColumnCardsResponse>(toKey);
    if (!toData) return;

    const sortedFrom = [...fromData.cards].sort((a, b) => a.order - b.order);
    const sortedTo = [...toData.cards].sort((a, b) => a.order - b.order);

    const activeIndex = sortedFrom.findIndex((card) => card.id === activeData.card.id);
    if (activeIndex === -1) return;

    const isSameColumn = activeData.year === targetYear && activeData.month === targetMonth;

    let overIndex = sortedTo.length;
    if (overData?.card) {
      overIndex = sortedTo.findIndex((card) => card.id === overData.card!.id);
      if (overIndex === -1) {
        overIndex = sortedTo.length;
      }
    }

    const fromSnapshot = { key: fromKey, data: fromData };
    const toSnapshot = { key: toKey, data: toData };

    try {
      if (isSameColumn) {
        const reordered = reorderWithinList(sortedFrom, activeIndex, overIndex);
        queryClient.setQueryData(fromKey, {
          ...fromData,
          cards: reordered,
        });
        const newOrder = reordered.find((card) => card.id === activeData.card.id)?.order ?? overIndex + 1;
        await cancellation;
        await moveCard({
          id: activeData.card.id,
          year: targetYear,
          month: targetMonth,
          order: newOrder,
        });
      } else {
        const withoutCard = sortedFrom.filter((card) => card.id !== activeData.card.id);
        const updatedFrom = withoutCard.map((card, index) => ({ ...card, order: index + 1 }));

        const insertedCard = { ...activeData.card, column_id: toData.column.id };
        const before = sortedTo.slice(0, overIndex);
        const after = sortedTo.slice(overIndex);
        const updatedTo = [...before, insertedCard, ...after].map((card, index) => ({
          ...card,
          order: index + 1,
        }));

        queryClient.setQueryData(fromKey, { ...fromData, cards: updatedFrom });
        queryClient.setQueryData(toKey, { ...toData, cards: updatedTo });

        const newOrder = updatedTo.find((card) => card.id === activeData.card.id)?.order ?? overIndex + 1;

        await cancellation;
        await moveCard({
          id: activeData.card.id,
          year: targetYear,
          month: targetMonth,
          order: newOrder,
        });

      }
    } catch {
      queryClient.setQueryData(fromSnapshot.key, fromSnapshot.data);
      queryClient.setQueryData(toSnapshot.key, toSnapshot.data);
      toastImpl.error("Move failed. Changes reverted");
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: fromKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: toKey, exact: true }),
      ]);
    }
  };

export const isUnchangedDrop = (event: DragEndEvent, queryClient: QueryClient) => {
  const active = event.active.data.current as { card: Card; year: number; month: number } | undefined;
  const over = event.over?.data.current as { card?: Card; year?: number; month?: number } | undefined;
  if (!active || !event.over) return true;
  if ((over?.year ?? active.year) !== active.year || (over?.month ?? active.month) !== active.month) return false;
  const data = queryClient.getQueryData<ColumnCardsResponse>(cardsKey(active.year, active.month));
  if (!data) return false;
  const cards = [...data.cards].sort((a, b) => a.order - b.order);
  const from = cards.findIndex((card) => card.id === active.card.id);
  if (from < 0) return false;
  const target = over?.card ? cards.findIndex((card) => card.id === over.card!.id) : cards.length - 1;
  return from === target;
};

export const Board = () => {
  const start = useMemo(() => new Date(), []);
  const months = useMemo<MonthKey[]>(() => getConsecutiveMonths(start, 4), [start]);
  const monthQueries = months.map(({ year, month }) => useMonthCards(year, month));
  const sensors = useBoardSensors();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [movingCardId, setMovingCardId] = useState<number | null>(null);
  const isCreating = useIsMutating({ mutationKey: createCardMutationKey }) > 0;
  const moveInProgress = useRef(false);
  const queryClient = useQueryClient();
  const { mutateAsync: moveCardMutation } = useMoveCard();

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { card: Card } | undefined;
    setActiveCard(data?.card ?? null);
  };

  const onDragEnd = createHandleDragEnd({
    queryClient,
    moveCard: async (payload) => {
      await moveCardMutation(payload);
    },
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    if (moveInProgress.current || isCreating || !event.over || isUnchangedDrop(event, queryClient)) return;
    moveInProgress.current = true;
    setIsMoving(true);
    setMovingCardId(Number(event.active.id));
    try {
      await onDragEnd(event);
    } finally {
      moveInProgress.current = false;
      setIsMoving(false);
      setMovingCardId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Track and move work across months. Drag cards or use keyboard shortcuts (space + arrows).
          </p>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {months.map(({ year, month }, index) => {
            const query = monthQueries[index];
            const data = query.data;
            return (
              <MonthColumn
                key={`${year}-${month}`}
                year={year}
                month={month}
                column={data?.column}
                cards={data?.cards ?? []}
                isLoading={query.isLoading}
                isMoving={isMoving || isCreating}
                movingCardId={movingCardId}
              />
            );
          })}
        </div>

        <DragOverlay>{activeCard ? <OverlayCard card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
};
