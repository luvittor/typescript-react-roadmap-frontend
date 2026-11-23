import { DndContext } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, useIsMutating, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cardsKey, createCardMutationKey, useMonthCards, useMonthSummaries, useMoveCard } from "../hooks/useBoard";
import { getConsecutiveMonths, type MonthKey } from "../../../utils/date";
import type { Card, ColumnCardsResponse } from "../types";
import { MonthColumn } from "./MonthColumn";
import { DragOverlay, useBoardSensors, reorderWithinList } from "../dnd";
import { CardItem } from "./CardItem";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

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
  onCollapse,
}: {
  month: MonthKey;
  isCurrent: boolean;
  isMoving: boolean;
  movingCardId: number | null;
  onCollapse: () => void;
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
      onCollapse={onCollapse}
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
  const [collapsedMonths, setCollapsedMonths] = useState<MonthKey[]>(() => {
    const date = new Date();
    return getConsecutiveMonths(new Date(date.getFullYear(), date.getMonth() - 1, 1), 1);
  });
  const monthStripRef = useRef<HTMLDivElement | null>(null);
  const lastExpandedFrom = useRef<MonthKey | null>(null);
  const lastCollapsedFrom = useRef<MonthKey | null>(null);
  const isPrependingCollapsed = useRef(false);
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
  const now = new Date();
  const lastCollapsedMonth = collapsedMonths[collapsedMonths.length - 1];
  const previousMonth = getConsecutiveMonths(new Date(now.getFullYear(), now.getMonth() - 1, 1), 1)[0]!;
  const summaryEnd = lastCollapsedMonth && lastCollapsedMonth.year * 12 + lastCollapsedMonth.month > previousMonth.year * 12 + previousMonth.month ? lastCollapsedMonth : previousMonth;
  const summaryStart = collapsedMonths[0] ?? summaryEnd;
  const summaries = useMonthSummaries(summaryStart, summaryEnd);
  const timelineMonths = [...collapsedMonths, ...months].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

  const expandMonth = (month: MonthKey) => {
    const strip = monthStripRef.current;
    const scrollLeft = strip?.scrollLeft ?? 0;
    setCollapsedMonths((items) => items.filter((item) => item.year !== month.year || item.month !== month.month));
    setMonths((items) => [...items, month].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)));
    requestAnimationFrame(() => { if (strip) strip.scrollLeft = scrollLeft; });
  };

  const collapseMonth = (month: MonthKey) => {
    const strip = monthStripRef.current;
    const scrollLeft = strip?.scrollLeft ?? 0;
    setMonths((items) => items.filter((item) => item.year !== month.year || item.month !== month.month));
    setCollapsedMonths((items) => [...items, month].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)));
    requestAnimationFrame(() => { if (strip) strip.scrollLeft = scrollLeft; });
  };

  const handleMonthScroll = useCallback(() => {
    const strip = monthStripRef.current;
    const last = months[months.length - 1];
    if (!strip || !last || strip.clientWidth === 0 || strip.scrollWidth === 0) return;
    if (strip.scrollLeft <= 1) {
      if (isPrependingCollapsed.current) return;
      const first = collapsedMonths[0]!;
      if (lastCollapsedFrom.current?.year === first.year && lastCollapsedFrom.current.month === first.month) return;
      isPrependingCollapsed.current = true;
      lastCollapsedFrom.current = first;
      const earlier = getConsecutiveMonths(new Date(first.year, first.month - 7, 1), 6);
      setCollapsedMonths((existing) => [...earlier, ...existing]);
      requestAnimationFrame(() => {
        if (strip) strip.scrollLeft = 6 * 48;
        isPrependingCollapsed.current = false;
      });
    }
    if (!isNearMonthStripEnd(strip)) return;
    if (lastExpandedFrom.current?.year === last.year && lastExpandedFrom.current.month === last.month) return;
    const later = getConsecutiveMonths(new Date(last.year, last.month, 1), 3);
    lastExpandedFrom.current = last;
    setMonths((existing) => [...existing, ...later]);
  }, [collapsedMonths, months]);

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

  const scrollTimeline = (direction: -1 | 1) => {
    const strip = monthStripRef.current;
    if (!strip) return;
    if (direction < 0 && strip.scrollLeft <= 1) {
      const first = collapsedMonths[0]!;
      if (!isPrependingCollapsed.current) {
        isPrependingCollapsed.current = true;
        lastCollapsedFrom.current = first;
        const earlier = getConsecutiveMonths(new Date(first.year, first.month - 7, 1), 6);
        setCollapsedMonths((existing) => [...earlier, ...existing]);
        requestAnimationFrame(() => {
          strip.scrollLeft = Math.max(0, 6 * 48 - strip.clientWidth / 2);
          isPrependingCollapsed.current = false;
        });
      }
      return;
    }
    if (typeof strip.scrollBy === "function") strip.scrollBy({ left: direction * 340, behavior: "smooth" });
    else strip.scrollLeft += direction * 340;
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-[calc(100vh-9rem)] items-stretch">
        <button type="button" aria-label="Scroll timeline left" onClick={() => scrollTimeline(-1)} className="z-10 flex w-12 flex-none items-center justify-center border-y border-r border-border/70 bg-background/90 text-muted-foreground hover:bg-muted" title="Earlier months"><ChevronLeft className="h-5 w-5" /></button>
        <div data-testid="month-strip" ref={monthStripRef} onScroll={handleMonthScroll} className="flex min-w-0 flex-1 items-stretch gap-0 overflow-x-auto border-y border-border/70 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {timelineMonths.map((month) => {
            const isCollapsed = collapsedMonths.some((item) => item.year === month.year && item.month === month.month);
            if (!isCollapsed) return <MonthQueryColumn key={`${month.year}-${month.month}`} month={month} isCurrent={month.year === current?.year && month.month === current?.month} isMoving={isMoving || isCreating} movingCardId={movingCardId} onCollapse={() => collapseMonth(month)} />;
            const count = summaries.data?.[`${month.year}-${month.month}`]?.card_count ?? 0;
            return <button key={`${month.year}-${month.month}`} type="button" aria-label={`${month.year}-${month.month}: ${summaries.isFetching ? "loading card total" : `${count} cards`}`} className="relative flex w-12 flex-none items-center justify-center border-r border-border/70 hover:bg-muted" onClick={() => {
              expandMonth(month);
            }}><span className="absolute top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] leading-4">{summaries.isFetching ? <LoaderCircle className="h-3 w-3 animate-spin" role="status" aria-label="Loading card total" /> : count}</span><span className="[writing-mode:vertical-rl] rotate-180 text-xs">{new Date(month.year, month.month - 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}</span></button>;
          })}
        </div>
        <button type="button" aria-label="Scroll timeline right" onClick={() => scrollTimeline(1)} className="z-10 flex w-12 flex-none items-center justify-center border-y border-l border-border/70 bg-background/90 text-muted-foreground hover:bg-muted" title="Later months"><ChevronRight className="h-5 w-5" /></button>
        </div>

        <DragOverlay>{activeCard ? <CardItem card={activeCard} year={0} month={0} isMoving={false} isBeingMoved={false} preview /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
};
