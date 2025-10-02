import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cardTitleSchema } from "../../../lib/validators";
import type { Card } from "../types";
import { boardApi } from "../api";
import type { CardStatus } from "../../../utils/status";

export const cardsKey = (year: number, month: number) => ["cards", year, month] as const;

export const useMonthCards = (year: number, month: number) =>
  useQuery({
    queryKey: cardsKey(year, month),
    queryFn: () => boardApi.getCards(year, month),
  });

export const useCreateCard = (year: number, month: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: boardApi.createCard,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: cardsKey(year, month) });
      const previous = queryClient.getQueryData<{ column: { id: number }; cards: Card[] }>(
        cardsKey(year, month),
      );

      const optimistic: Card = {
        id: Math.random() * -100000,
        column_id: input.column_id,
        order: input.order,
        title: input.title ?? "",
        status: "not_started",
      };

      queryClient.setQueryData(cardsKey(year, month), (current: any) => {
        const column = current?.column ?? { id: input.column_id };
        const cards: Card[] = current?.cards ?? [];
        const shifted = cards.map((card) => ({ ...card, order: card.order + 1 }));
        return {
          column,
          cards: [optimistic, ...shifted],
        };
      });

      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cardsKey(year, month), context.previous);
      }
      toast.error("Could not create card");
    },
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData(cardsKey(year, month), (current: any) => {
        if (!current) return current;
        return {
          ...current,
          cards: current.cards
            .map((card: Card) => (card.id === context?.optimisticId ? data : card))
            .map((card: Card, index: number) => ({ ...card, order: index + 1 })),
        };
      });
      toast.success("Card added");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cardsKey(year, month) });
    },
  });
};

export const useUpdateCardTitle = (year: number, month: number, id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) => boardApi.updateTitle(id, title),
    onMutate: async (title) => {
      cardTitleSchema.parse({ title });
      await queryClient.cancelQueries({ queryKey: cardsKey(year, month) });
      const previous = queryClient.getQueryData<{ column: any; cards: Card[] }>(
        cardsKey(year, month),
      );
      queryClient.setQueryData(cardsKey(year, month), (current: any) => {
        if (!current) return current;
        return {
          ...current,
          cards: current.cards.map((card: Card) =>
            card.id === id ? { ...card, title } : card,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _title, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cardsKey(year, month), context.previous);
      }
      toast.error("Could not update title");
    },
    onSuccess: () => {
      toast.success("Title updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cardsKey(year, month) });
    },
  });
};

export const useUpdateCardStatus = (year: number, month: number, id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: CardStatus) => boardApi.updateStatus(id, status),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: cardsKey(year, month) });
      const previous = queryClient.getQueryData<{ column: any; cards: Card[] }>(
        cardsKey(year, month),
      );
      queryClient.setQueryData(cardsKey(year, month), (current: any) => {
        if (!current) return current;
        return {
          ...current,
          cards: current.cards.map((card: Card) =>
            card.id === id ? { ...card, status } : card,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _status, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cardsKey(year, month), context.previous);
      }
      toast.error("Could not update status");
    },
    onSuccess: () => {
      toast.success("Status updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cardsKey(year, month) });
    },
  });
};

export const useDeleteCard = (year: number, month: number, id: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => boardApi.removeCard(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cardsKey(year, month) });
      const previous = queryClient.getQueryData<{ column: any; cards: Card[] }>(
        cardsKey(year, month),
      );
      queryClient.setQueryData(cardsKey(year, month), (current: any) => {
        if (!current) return current;
        return {
          ...current,
          cards: current.cards
            .filter((card: Card) => card.id !== id)
            .map((card: Card, index: number) => ({ ...card, order: index + 1 })),
        };
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cardsKey(year, month), context.previous);
      }
      toast.error("Could not delete card");
    },
    onSuccess: () => {
      toast.success("Card deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cardsKey(year, month) });
    },
  });
};

export const useMoveCard = () =>
  useMutation({
    mutationFn: ({
      id,
      year,
      month,
      order,
    }: {
      id: number;
      year: number;
      month: number;
      order: number;
    }) => boardApi.updatePosition(id, { year, month, order }),
    onError: () => {
      toast.error("Could not move card");
    },
  });
