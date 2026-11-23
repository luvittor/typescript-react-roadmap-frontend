import { DndContext, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import { useBoardSensors } from "../src/features/board/dnd";
import { CardItem } from "../src/features/board/components/CardItem";
import type { Card } from "../src/features/board/types";

const { updateTitleMock } = vi.hoisted(() => ({ updateTitleMock: vi.fn() }));

vi.mock("../src/features/board/hooks/useBoard", () => ({
  useDeleteCard: () => ({ mutate: vi.fn(), isPending: false }),
  useEnsureMonthColumn: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateCard: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCardStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCardColor: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCardTitle: () => ({ mutateAsync: updateTitleMock, isPending: false }),
}));

const card: Card = {
  id: 1,
  column_id: 1,
  order: 1,
  title: "Plan trip",
  status: "not_started",
};

const renderSortableCard = (onDragStart: (event: DragStartEvent) => void) => {
  const TestBoard = () => {
    const sensors = useBoardSensors();

    return (
      <DndContext sensors={sensors} onDragStart={onDragStart}>
        <SortableContext items={[card.id]} strategy={verticalListSortingStrategy}>
          <CardItem card={card} year={2026} month={11} isMoving={false} isBeingMoved={false} />
        </SortableContext>
      </DndContext>
    );
  };

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <TestBoard />
    </QueryClientProvider>,
  );
};

describe("CardItem keyboard interactions", () => {
  it("keeps spaces in the title editor without starting a drag or losing focus", async () => {
    const onDragStart = vi.fn<(event: DragStartEvent) => void>();
    renderSortableCard(onDragStart);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: card.title }));
    const titleInput = screen.getByRole("textbox", { name: "Edit card title" });

    expect(titleInput).toHaveFocus();
    await user.type(titleInput, " with spaces");

    expect(titleInput).toHaveValue("Plan trip with spaces");
    expect(titleInput).toHaveFocus();
    expect(onDragStart).not.toHaveBeenCalled();
  });

});
