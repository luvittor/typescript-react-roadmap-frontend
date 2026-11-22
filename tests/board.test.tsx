import type { DragEndEvent } from "@dnd-kit/core";
import userEvent from "@testing-library/user-event";
import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";

import { Board, createHandleDragEnd, isNearMonthStripEnd, isUnchangedDrop } from "../src/features/board/components/Board";
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
const updateColorMock = vi.fn();
const removeCardMock = vi.fn();
const getCardMock = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("../src/features/board/api", () => ({
  boardApi: {
    getCards: (...args: any[]) => getCardsMock(...args),
    createCard: (...args: any[]) => createCardMock(...args),
    updatePosition: (...args: any[]) => updatePositionMock(...args),
    updateTitle: (...args: any[]) => updateTitleMock(...args),
    updateStatus: (...args: any[]) => updateStatusMock(...args),
    updateColor: (...args: any[]) => updateColorMock(...args),
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

  it("loads more months when the strip is near its end or already fits the viewport", () => {
    expect(isNearMonthStripEnd({ scrollLeft: 0, clientWidth: 2600, scrollWidth: 2040 })).toBe(true);
    expect(isNearMonthStripEnd({ scrollLeft: 0, clientWidth: 1200, scrollWidth: 2040 })).toBe(false);
    expect(isNearMonthStripEnd({ scrollLeft: 400, clientWidth: 1200, scrollWidth: 2040 })).toBe(true);
  });

  it("automatically loads additional months when the viewport is wider than the initial strip", async () => {
    const previousClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
    const previousScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset.testid === "month-strip" ? 2600 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset.testid === "month-strip" ? this.childElementCount * 340 : 0;
      },
    });

    try {
      getCardsMock.mockImplementation(async (year: number, month: number) => ({
        column: { id: year * 10 + month, year, month, user_id: 1 },
        cards: [],
      }));

      renderWithProviders(<Board />, { route: "/board" });

      await waitFor(() => expect(screen.getAllByRole("region")).toHaveLength(12));
    } finally {
      if (previousClientWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", previousClientWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
      if (previousScrollWidth) Object.defineProperty(HTMLElement.prototype, "scrollWidth", previousScrollWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollWidth");
    }
  });

  it("recognizes a drop back in the same position without blocking real moves", () => {
    const client = new QueryClient();
    const first: Card = { id: 1, column_id: 10, order: 1, title: "First", status: "not_started" };
    const second: Card = { id: 2, column_id: 10, order: 2, title: "Second", status: "not_started" };
    client.setQueryData(cardsKey(2025, 10), { column: { id: 10, year: 2025, month: 10, user_id: 1 }, cards: [first, second] });
    const event = (card: Card, target: { card?: Card; year: number; month: number }) => ({
      active: { id: card.id, data: { current: { card, year: 2025, month: 10 } } },
      over: { id: target.card?.id ?? "column", data: { current: target } },
    }) as unknown as DragEndEvent;
    expect(isUnchangedDrop(event(first, { card: first, year: 2025, month: 10 }), client)).toBe(true);
    expect(isUnchangedDrop(event(second, { year: 2025, month: 10 }), client)).toBe(true);
    expect(isUnchangedDrop(event(first, { card: second, year: 2025, month: 10 }), client)).toBe(false);
    expect(isUnchangedDrop(event(first, { year: 2025, month: 11 }), client)).toBe(false);
  });

  it("renders six months and card titles", async () => {
    const months = getConsecutiveMonths(new Date(), 6);
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

  it("keeps drag and delete controls labelled and keyboard focusable with discreet styling", async () => {
    const [month] = getConsecutiveMonths(new Date(), 6);
    getCardsMock.mockImplementation(async (year: number, currentMonth: number) => ({
      column: { id: year * 10 + currentMonth, year, month: currentMonth, user_id: 1 },
      cards: year === month.year && currentMonth === month.month
        ? [{ id: 72, column_id: year * 10 + currentMonth, order: 1, title: "Accessible card", status: "not_started" as const }]
        : [],
    }));

    renderWithProviders(<Board />, { route: "/board" });

    const card = await screen.findByText("Accessible card");
    const cardItem = within(card.closest("li")!);
    const moveTarget = cardItem.getByRole("group", { name: "Roadmap card: Accessible card" });
    const optionsButton = cardItem.getByRole("button", { name: "Card options" });

    expect(moveTarget).toHaveAttribute("tabindex", "0");
    expect(optionsButton).toHaveClass("card-control");
    expect(moveTarget).toHaveClass("border-l-slate-400");

    const user = userEvent.setup();
    await user.tab();
    await user.tab();
    expect(moveTarget).toHaveFocus();
    expect(cardItem.queryByRole("button", { name: "Drag card" })).not.toBeInTheDocument();
  });

  it("cycles the tri-state checkbox through not started, in progress, and completed", async () => {
    const [month] = getConsecutiveMonths(new Date(), 6);
    let currentStatus: Card["status"] = "not_started";
    updateStatusMock.mockImplementation(async (_id: number, status: Card["status"]) => {
      currentStatus = status;
    });
    getCardsMock.mockImplementation(async (year: number, currentMonth: number) => ({
      column: { id: year * 10 + currentMonth, year, month: currentMonth, user_id: 1 },
      cards: year === month.year && currentMonth === month.month
        ? [{ id: 73, column_id: year * 10 + currentMonth, order: 1, title: "Status card", status: currentStatus }]
        : [],
    }));

    renderWithProviders(<Board />, { route: "/board" });

    const card = await screen.findByText("Status card");
    const cardItem = within(card.closest("li")!);
    const statusCheckbox = cardItem.getByRole("checkbox");
    const actionRow = cardItem.getByTestId("card-main-row");
    expect(within(actionRow).getByRole("button", { name: "Card options" })).toBeInTheDocument();
    expect(within(actionRow).getByRole("button", { name: "Status card" })).toBeInTheDocument();
    expect(statusCheckbox).toHaveAttribute("aria-checked", "false");

    const user = userEvent.setup();
    await user.click(statusCheckbox);
    await waitFor(() => expect(updateStatusMock).toHaveBeenCalledWith(73, "in_progress"));
    await waitFor(() => expect(statusCheckbox).toHaveAttribute("aria-checked", "mixed"));
    expect(statusCheckbox).toHaveClass("bg-sky-500");
    expect(statusCheckbox.querySelector("span")).toHaveClass("h-0.5", "w-2", "bg-white");
    await waitFor(() => expect(statusCheckbox).toBeEnabled());

    await user.click(statusCheckbox);
    await waitFor(() => expect(updateStatusMock).toHaveBeenCalledWith(73, "completed"));
    await waitFor(() => expect(statusCheckbox).toHaveAttribute("aria-checked", "true"));
    await waitFor(() => expect(statusCheckbox).toBeEnabled());

    await user.click(statusCheckbox);
    await waitFor(() => expect(statusCheckbox).toHaveAttribute("aria-checked", "false"));
  });

  it("selects and persists a card color independently from its status", async () => {
    const [month] = getConsecutiveMonths(new Date(), 6);
    updateColorMock.mockImplementation(async (_id: number, color: Card["color"]) => ({ color }));
    getCardsMock.mockImplementation(async (year: number, currentMonth: number) => ({
      column: { id: year * 10 + currentMonth, year, month: currentMonth, user_id: 1 },
      cards: year === month.year && currentMonth === month.month
        ? [{ id: 74, column_id: year * 10 + currentMonth, order: 1, title: "Colored card", status: "in_progress", color: "teal" }]
        : [],
    }));

    renderWithProviders(<Board />, { route: "/board" });
    const card = await screen.findByText("Colored card");
    const item = within(card.closest("li")!);
    const checkbox = item.getByRole("checkbox");
    const user = userEvent.setup();
    const optionsButton = item.getByRole("button", { name: "Card options" });
    expect(item.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(optionsButton);
    const teal = item.getByRole("menuitemradio", { name: "Set card color to Teal" });

    await user.click(teal);

    await waitFor(() => expect(updateColorMock).toHaveBeenCalledWith(74, "teal"));
    expect(checkbox).toHaveAttribute("aria-checked", "mixed");
    expect(item.queryByRole("menu")).not.toBeInTheDocument();
    expect(item.getByRole("button", { name: "Card options" })).toBeInTheDocument();
    await waitFor(() => expect(item.getByRole("group", { name: "Roadmap card: Colored card" })).toHaveClass("border-l-teal-500"));
  });

  it("renders the same tri-state checkbox content in the fixed card and drag preview", async () => {
    const [month] = getConsecutiveMonths(new Date(), 6);
    getCardsMock.mockImplementation(async (year: number, currentMonth: number) => ({
      column: { id: year * 10 + currentMonth, year, month: currentMonth, user_id: 1 },
      cards: year === month.year && currentMonth === month.month
        ? [{ id: 75, column_id: year * 10 + currentMonth, order: 1, title: "Preview check", status: "completed", color: "blue" }]
        : [],
    }));
    renderWithProviders(<Board />, { route: "/board" });
    const fixedCheckbox = await screen.findByRole("checkbox");

    const context = screen.getByRole("button", { name: "Preview check" });
    await userEvent.setup().pointer([{ keys: "[MouseLeft>]",
      target: context,
    }]);
    const checkboxes = screen.getAllByText((_, element) => element?.tagName.toLowerCase() === "svg");
    expect(fixedCheckbox).toHaveClass("h-4", "w-4", "bg-sky-500");
    expect(fixedCheckbox.querySelector("svg")).toHaveClass("h-3", "w-3");
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
    const [month] = getConsecutiveMonths(now, 4);
    const targetColumn = await screen.findByRole("region", { name: formatMonthLabel(month) });
    await user.click(await within(targetColumn).findByRole("button", { name: `Add card to ${month.month}/${month.year}` }));
    const input = within(targetColumn).getByPlaceholderText("Add card");
    await user.type(input, "New Task");
    await user.click(within(targetColumn).getByRole("button", { name: "Add card", exact: true }));

    await waitFor(() => {
      expect(createCardMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText("New Task")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Existing")).toBeInTheDocument();
  });

  it("prevents moving a new card until creation and month refresh finish", async () => {
    const [month] = getConsecutiveMonths(new Date(), 4);
    const column = { id: 10, ...month, user_id: 1 };
    const saved: Card = { id: 42, column_id: 10, order: 1, title: "New task", status: "not_started" };
    let resolveCreate!: (card: Card) => void;
    let resolveRefresh!: (value: { column: typeof column; cards: Card[] }) => void;
    let savedOnServer = false;
    createCardMock.mockImplementation(() => new Promise<Card>((resolve) => { resolveCreate = resolve; }));
    getCardsMock.mockImplementation((year: number, currentMonth: number) => {
      if (year === month.year && currentMonth === month.month) {
        return savedOnServer
          ? new Promise((resolve) => { resolveRefresh = resolve; })
          : Promise.resolve({ column, cards: [] });
      }
      return Promise.resolve({ column: { id: year * 100 + currentMonth, year, month: currentMonth, user_id: 1 }, cards: [] });
    });

    renderWithProviders(<Board />, { route: "/board" });
    const user = userEvent.setup();
    const targetColumn = await screen.findByRole("region", { name: formatMonthLabel(month) });
    await user.click(await within(targetColumn).findByRole("button", { name: `Add card to ${month.month}/${month.year}` }));
    await user.type(within(targetColumn).getByPlaceholderText("Add card"), "New task");
    await user.click(within(targetColumn).getByRole("button", { name: "Add card", exact: true }));
    const temporaryCard = await screen.findByText("New task");
    const temporaryContainer = temporaryCard.closest("li")!;
    const temporaryCardItem = within(temporaryContainer);
    expect(temporaryCardItem.getByRole("status", { name: /saving card/i })).toBeInTheDocument();
    expect(temporaryCardItem.queryByRole("button", { name: "Card options" })).not.toBeInTheDocument();
    expect(within(temporaryContainer).getByRole("group", { name: "Roadmap card: New task" })).toHaveAttribute("aria-disabled", "true");
    expect(within(temporaryContainer).queryByRole("button", { name: "Card options" })).not.toBeInTheDocument();
    expect(temporaryCard).toBeDisabled();
    expect(updatePositionMock).not.toHaveBeenCalled();

    savedOnServer = true;
    await act(async () => { resolveCreate(saved); });
    await waitFor(() => expect(resolveRefresh).toBeDefined());
    expect(within(screen.getByText("New task").closest("li")!).getByRole("group", { name: "Roadmap card: New task" })).toHaveAttribute("aria-disabled", "true");
    await act(async () => { resolveRefresh({ column, cards: [saved] }); });
    await waitFor(() => expect(within(screen.getByText("New task").closest("li")!).getByRole("group", { name: "Roadmap card: New task" })).toHaveAttribute("aria-disabled", "false"));
    expect(within(screen.getByText("New task").closest("li")!).getByRole("button", { name: "Card options" })).toBeInTheDocument();
    expect(within(screen.getByText("New task").closest("li")!).queryByRole("status", { name: /saving card/i })).not.toBeInTheDocument();
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

    const move = handler(event);

    expect(queryClient.getQueryData<{ cards: Card[] }>(cardsKey(2025, 10))?.cards).toEqual([]);
    expect(queryClient.getQueryData<{ cards: Card[] }>(cardsKey(2025, 11))?.cards).toEqual([
      { ...octoberCard, column_id: 1011 },
    ]);
    await move;

    expect(moveSpy).toHaveBeenCalledWith({ id: 1, year: 2025, month: 11, order: 1 });
  });

  it("ignores an older month response and allows consecutive moves", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const card: Card = { id: 1, column_id: 10, order: 1, title: "Plan", status: "not_started" };
    const columns = [10, 11, 12].map((month) => ({ id: month, year: 2025, month, user_id: 1 }));
    for (const column of columns) {
      queryClient.setQueryData(cardsKey(2025, column.month), {
        column, cards: column.month === 10 ? [card] : [],
      });
    }

    let resolveOldResponse!: (value: { column: typeof columns[number]; cards: Card[] }) => void;
    const oldResponse = new Promise<{ column: typeof columns[number]; cards: Card[] }>((resolve) => {
      resolveOldResponse = resolve;
    });
    const oldFetch = queryClient.fetchQuery({
      queryKey: cardsKey(2025, 10),
      queryFn: () => oldResponse,
      staleTime: 0,
    }).catch(() => undefined);

    const moveCard = vi.fn().mockResolvedValue(undefined);
    const handler = createHandleDragEnd({ queryClient, moveCard });
    const event = (source: number, target: number, movingCard: Card) => ({
      active: { id: 1, data: { current: { card: movingCard, year: 2025, month: source } } },
      over: { id: `drop-2025-${target}`, data: { current: { year: 2025, month: target } } },
    }) as unknown as DragEndEvent;

    await handler(event(10, 11, card));
    resolveOldResponse({ column: columns[0], cards: [card] });
    await oldFetch;
    const moved = { ...card, column_id: 11 };
    await handler(event(11, 12, moved));

    expect(moveCard).toHaveBeenCalledTimes(2);
    expect(moveCard).toHaveBeenLastCalledWith({ id: 1, year: 2025, month: 12, order: 1 });
    expect(queryClient.getQueryData<{ cards: Card[] }>(cardsKey(2025, 10))?.cards).toEqual([]);
    expect(queryClient.getQueryData<{ cards: Card[] }>(cardsKey(2025, 11))?.cards).toEqual([]);
    expect(queryClient.getQueryData<{ cards: Card[] }>(cardsKey(2025, 12))?.cards).toEqual([{ ...card, column_id: 12 }]);
  });

  it("waits for both months to refresh before completing a move", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const card: Card = { id: 1, column_id: 10, order: 1, title: "Plan", status: "not_started" };
    const source = { column: { id: 10, year: 2025, month: 10, user_id: 1 }, cards: [card] };
    const target = { column: { id: 11, year: 2025, month: 11, user_id: 1 }, cards: [] as Card[] };
    client.setQueryData(cardsKey(2025, 10), source);
    client.setQueryData(cardsKey(2025, 11), target);

    let resolveTarget!: (value: typeof target) => void;
    const targetResponse = new Promise<typeof target>((resolve) => { resolveTarget = resolve; });
    const sourceObserver = new QueryObserver(client, { queryKey: cardsKey(2025, 10), queryFn: async () => ({ ...source, cards: [] }) });
    const targetObserver = new QueryObserver(client, { queryKey: cardsKey(2025, 11), queryFn: () => targetResponse });
    const unsubscribeSource = sourceObserver.subscribe(() => {});
    const unsubscribeTarget = targetObserver.subscribe(() => {});
    const handler = createHandleDragEnd({ queryClient: client, moveCard: vi.fn().mockResolvedValue(undefined) });
    const event = {
      active: { id: 1, data: { current: { card, year: 2025, month: 10 } } },
      over: { id: "drop-2025-11", data: { current: { year: 2025, month: 11 } } },
    } as unknown as DragEndEvent;
    let completed = false;
    const moving = handler(event).then(() => { completed = true; });
    await waitFor(() => expect(targetObserver.getCurrentResult().isFetching).toBe(true));
    expect(completed).toBe(false);
    resolveTarget({ ...target, cards: [{ ...card, column_id: 11 }] });
    await moving;
    expect(completed).toBe(true);
    expect(client.getQueryData<typeof source>(cardsKey(2025, 10))?.cards).toEqual([]);
    expect(client.getQueryData<typeof target>(cardsKey(2025, 11))?.cards).toEqual([{ ...card, column_id: 11 }]);
    unsubscribeSource();
    unsubscribeTarget();
  });

  it("restores both months after a failed move and permits a retry", async () => {
    const client = new QueryClient();
    const card: Card = { id: 1, column_id: 10, order: 1, title: "Plan", status: "not_started" };
    const source = { column: { id: 10, year: 2025, month: 10, user_id: 1 }, cards: [card] };
    const target = { column: { id: 11, year: 2025, month: 11, user_id: 1 }, cards: [] as Card[] };
    client.setQueryData(cardsKey(2025, 10), source);
    client.setQueryData(cardsKey(2025, 11), target);
    const moveCard = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    const handler = createHandleDragEnd({ queryClient: client, moveCard });
    const event = {
      active: { id: 1, data: { current: { card, year: 2025, month: 10 } } },
      over: { id: "drop-2025-11", data: { current: { year: 2025, month: 11 } } },
    } as unknown as DragEndEvent;

    await handler(event);
    expect(client.getQueryData(cardsKey(2025, 10))).toEqual(source);
    expect(client.getQueryData(cardsKey(2025, 11))).toEqual(target);
    await handler(event);
    expect(moveCard).toHaveBeenCalledTimes(2);
    expect(client.getQueryData<typeof source>(cardsKey(2025, 10))?.cards).toEqual([]);
    expect(client.getQueryData<typeof target>(cardsKey(2025, 11))?.cards).toEqual([{ ...card, column_id: 11 }]);
  });
});
