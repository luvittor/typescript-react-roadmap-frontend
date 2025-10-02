import type { DragEndEvent } from "@dnd-kit/core";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { Board, createHandleDragEnd } from "../src/features/board/components/Board";
import { renderWithProviders, resetAuthStore } from "./test-utils";
import { useAuthStore } from "../src/store/auth-store";
import { cardsKey } from "../src/features/board/hooks/useBoard";
import type { Card } from "../src/features/board/types";
import { getConsecutiveMonths, formatMonthLabel } from "../src/utils/date";

const getCardsMock = vi.fn();
const createCardMock = vi.fn();
const updatePositionMock = vi.fn();
const updateTitleMock = vi.fn();
const updateStatusMock = vi.fn();
const removeCardMock = vi.fn();
const getCardMock = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../src/features/board/api", () => ({
  boardApi: {
    getCards: (...args: any[]) => getCardsMock(...args),
    createCard: (...args: any[]) => createCardMock(...args),
    updatePosition: (...args: any[]) => updatePositionMock(...args),
    updateTitle: (...args: any[]) => updateTitleMock(...args),
    updateStatus: (...args: any[]) => updateStatusMock(...args),
    removeCard: (...args: any[]) => removeCardMock(...args),
    getCard: (...args: any[]) => getCardMock(...args),
  },
}));

describe("Board", () => {
  beforeEach(() => {
    resetAuthStore();
    vi.clearAllMocks();
    useAuthStore.setState({ token: "token", user: { id: 1, email: "user@example.com" }, isHydrated: true });
  });

  it("renders four months and card titles", async () => {
    const months = getConsecutiveMonths(new Date(), 4);
    const cardsByMonth: Record<string, Card[]> = {
      [`${months[0].year}-${months[0].month}`]: [
        { id: 1, column_id: 110, order: 1, title: "Card A", status: "not_started" },
      ],
      [`${months[1].year}-${months[1].month}`]: [
        { id: 2, column_id: 111, order: 1, title: "Card B", status: "in_progress" },
      ],
    };

    getCardsMock.mockImplementation(async (year: number, month: number) => ({
      column: { id: year * 10 + month, year, month, user_id: 1 },
      cards: cardsByMonth[`${year}-${month}`] ?? [],
    }));

    renderWithProviders(<Board />, { route: "/board" });

    expect(await screen.findByText("Card A")).toBeInTheDocument();
    expect(screen.getByText("Card B")).toBeInTheDocument();

    months.forEach((month) => {
      expect(screen.getByText(formatMonthLabel(month))).toBeInTheDocument();
    });
  });

  it("rolls back optimistic card creation on error", async () => {
    const now = new Date();
    getCardsMock.mockImplementation(async (year: number, month: number) => ({
      column: { id: year * 10 + month, year, month, user_id: 1 },
      cards:
        year === now.getFullYear() && month === now.getMonth() + 1
          ? [
              { id: 1, column_id: year * 10 + month, order: 1, title: "Existing", status: "not_started" },
            ]
          : [],
    }));

    createCardMock.mockRejectedValue(new Error("failed"));

    renderWithProviders(<Board />, { route: "/board" });

    const user = userEvent.setup();
    const inputs = await screen.findAllByPlaceholderText(/add card/i);
    await user.clear(inputs[0]);
    await user.type(inputs[0], "New Task");
    await user.click(screen.getAllByRole("button", { name: /add/i })[0]);

    await waitFor(() => {
      expect(createCardMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText("New Task")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Existing")).toBeInTheDocument();
  });

  it("creates correct move payload when dragging across months", async () => {
    const queryClient = new QueryClient();

    const octoberCard: Card = {
      id: 1,
      column_id: 1010,
      order: 1,
      title: "Plan trip",
      status: "not_started",
    };

    const novemberColumn = { id: 1011, year: 2025, month: 11, user_id: 1 };

    queryClient.setQueryData(cardsKey(2025, 10), {
      column: { id: 1010, year: 2025, month: 10, user_id: 1 },
      cards: [octoberCard],
    });

    queryClient.setQueryData(cardsKey(2025, 11), {
      column: novemberColumn,
      cards: [],
    });

    const moveSpy = vi.fn().mockResolvedValue(undefined);
    const toastSpy = { error: vi.fn(), success: vi.fn() } as any;

    const handler = createHandleDragEnd({
      queryClient,
      moveCard: async (payload) => {
        moveSpy(payload);
      },
      toastImpl: toastSpy,
    });

    const event = {
      active: {
        id: 1,
        data: {
          current: {
            card: octoberCard,
            year: 2025,
            month: 10,
          },
        },
      },
      over: {
        id: "drop-2025-11",
        data: {
          current: {
            year: 2025,
            month: 11,
          },
        },
      },
    } as unknown as DragEndEvent;

    await handler(event);

    expect(moveSpy).toHaveBeenCalledWith({ id: 1, year: 2025, month: 11, order: 1 });
  });
});
