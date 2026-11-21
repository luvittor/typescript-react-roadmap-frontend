import { render, screen } from "@testing-library/react";
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

describe("MonthColumn drop target", () => {
  it("attaches the month drop target to the full-height column, not only the card list", () => {
    render(
      <MonthColumn
        year={2026}
        month={11}
        cards={[]}
        isLoading={false}
        isMoving={false}
        movingCardId={null}
      />,
    );

    const column = screen.getByRole("region", { name: "Nov 26" });
    const cardList = screen.getByRole("list");

    expect(column).toHaveAttribute("data-drop-zone", "drop-2026-11");
    expect(column).toHaveClass("self-stretch");
    expect(cardList).not.toHaveAttribute("data-drop-zone");
    expect(useDroppableMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "drop-2026-11" }),
    );
  });
});
