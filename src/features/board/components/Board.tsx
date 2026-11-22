import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cardsKey, createCardMutationKey, useMonthCards, useMoveCard } from "../hooks/useBoard";
import { getConsecutiveMonths, type MonthKey } from "../../../utils/date";
import type { Card, ColumnCardsResponse } from "../types";
import { MonthColumn } from "./MonthColumn";
import { DragOverlay, useBoardSensors, reorderWithinList } from "../dnd";
import { CardItem } from "./CardItem";

export const isNearMonthStripEnd = ({
  scrollLeft,
  clientWidth,
  scrollWidth,
}: Pick<HTMLElement, "scrollLeft" | "clientWidth" | "scrollWidth">) =>
  scrollLeft + clientWidth >= scrollWidth - 500;

const MonthQueryColumn = ({
  month,
  isCurrent,
  isMoving,
  movingCardId,
}: {
  month: MonthKey;
  isCurrent: boolean;
  isMoving: boolean;
  movingCardId: number | null;
}) => {
  const query = useMonthCards(month.year, month.month);
  return (
    <MonthColumn
      year={month.year}
      month={month.month}
      column={query.data?.column}
      cards={query.data?.cards ?? []}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => void query.refetch()}
      isCurrent={isCurrent}
      isMoving={isMoving}
      movingCardId={movingCardId}
    />
  );
};

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

        const insertedCard = { ...activeData.card, column_id: toData.column?.id ?? activeData.card.column_id };
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
  const [months, setMonths] = useState<MonthKey[]>(() => getConsecutiveMonths(new Date(), 6));
  const monthStripRef = useRef<HTMLDivElement | null>(null);
  const lastExpandedFrom = useRef<MonthKey | null>(null);
  const current = months.find(({ year, month }) => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  });
  const sensors = useBoardSensors();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [movingCardId, setMovingCardId] = useState<number | null>(null);
  const isCreating = useIsMutating({ mutationKey: createCardMutationKey }) > 0;
  const moveInProgress = useRef(false);
  const queryClient = useQueryClient();
  const { mutateAsync: moveCardMutation } = useMoveCard();

  const loadEarlierMonths = () => {
    const first = months[0];
    if (!first) return;
    const earlier = getConsecutiveMonths(new Date(first.year, first.month - 1 - 6, 1), 6);
    setMonths((existing) => [...earlier, ...existing]);
  };

  const handleMonthScroll = useCallback(() => {
    const strip = monthStripRef.current;
    const last = months[months.length - 1];
    if (!strip || !last || strip.clientWidth === 0 || strip.scrollWidth === 0 || !isNearMonthStripEnd(strip)) return;
    if (lastExpandedFrom.current?.year === last.year && lastExpandedFrom.current.month === last.month) return;
    const later = getConsecutiveMonths(new Date(last.year, last.month, 1), 3);
    lastExpandedFrom.current = last;
    setMonths((existing) => [...existing, ...later]);
  }, [months]);

  useEffect(() => {
    const checkMonthStrip = () => handleMonthScroll();
    checkMonthStrip();
    window.addEventListener("resize", checkMonthStrip);
    return () => window.removeEventListener("resize", checkMonthStrip);
  }, [handleMonthScroll]);

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
    <div className="flex flex-1 flex-col gap-5">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <button type="button" onClick={loadEarlierMonths} className="mx-5 w-fit rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:mx-8">
          Load earlier months
        </button>
        <div data-testid="month-strip" ref={monthStripRef} onScroll={handleMonthScroll} className="flex min-h-[calc(100vh-9rem)] items-stretch gap-0 overflow-x-auto border-y border-border/70 pb-4 [scrollbar-width:thin]">
          {months.map((month) => (
            <MonthQueryColumn
              key={`${month.year}-${month.month}`}
              month={month}
              isCurrent={month === current}
              isMoving={isMoving || isCreating}
              movingCardId={movingCardId}
            />
          ))}
        </div>

        <DragOverlay>{activeCard ? <CardItem card={activeCard} year={0} month={0} isMoving={false} isBeingMoved={false} preview /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
};
