import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useDroppableMock } = vi.hoisted(() => ({ useDroppableMock: vi.fn() }));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();

  return {
    ...actual,
    useDndContext: () => ({ active: null, over: null }),
    useDroppable: (options: { id: string }) => {
      useDroppableMock(options);
      return {
        setNodeRef: (node: HTMLElement | null) => {
          if (node) node.dataset.dropZone = options.id;
        },
      };
    },
  };
});

import { MonthColumn } from "../src/features/board/components/MonthColumn";
import { renderWithProviders } from "./test-utils";
import { formatMonthLabel } from "../src/utils/date";

describe("MonthColumn drop target", () => {
  it("attaches the month drop target to the full-height column, not only the card list", () => {
    renderWithProviders(
      <MonthColumn
        year={2026}
        month={11}
        cards={[]}
        isLoading={false}
        isMoving={false}
        movingCardId={null}
        isCurrent
        isError={false}
        onRetry={() => {}}
        onCollapse={() => {}}
      />,
    );

    const column = screen.getByRole("region", { name: formatMonthLabel({ year: 2026, month: 11 }) });
    const cardList = screen.getByRole("list");

    expect(column).toHaveAttribute("data-drop-zone", "drop-2026-11");
    expect(column).toHaveClass("self-stretch");
    expect(cardList).not.toHaveAttribute("data-drop-zone");
    expect(useDroppableMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "drop-2026-11" }),
    );
  });
});
