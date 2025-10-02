import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createContext } from "react";

import type { Card } from "../types";
import type { MonthKey } from "../../../utils/date";

export const useBoardSensors = () =>
  useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

export const findCardIndex = (cards: Card[], cardId: number) =>
  cards.findIndex((card) => card.id === cardId);

export const reorderWithinList = (cards: Card[], from: number, to: number) =>
  arrayMove(cards, from, to).map((card, index) => ({ ...card, order: index + 1 }));

export const BoardDndContext = createContext<{
  onDragEnd: (event: DragEndEvent) => void;
  activeCard: Card | null;
}>({
  onDragEnd: () => {},
  activeCard: null,
});

export const BoardDndProvider = ({
  sensors,
  onDragEnd,
  activeCard,
  children,
}: {
  sensors: ReturnType<typeof useBoardSensors>;
  onDragEnd: (event: DragEndEvent) => void;
  activeCard: Card | null;
  children: React.ReactNode;
}) => (
  <BoardDndContext.Provider value={{ onDragEnd, activeCard }}>
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      {children}
    </DndContext>
  </BoardDndContext.Provider>
);

export const ColumnSortableContext = ({
  columnId,
  cards,
  children,
}: {
  columnId: MonthKey;
  cards: Card[];
  children: React.ReactNode;
}) => (
  <SortableContext
    id={`${columnId.year}-${columnId.month}`}
    items={cards.map((card) => card.id)}
    strategy={verticalListSortingStrategy}
  >
    {children}
  </SortableContext>
);

export { DragOverlay };
