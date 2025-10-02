import { api } from "../../lib/http";
import type { Card, CardWithColumn, Column, ColumnCardsResponse } from "./types";
import type { CardStatus } from "../../utils/status";

const basePath = "/api/v1";

export const boardApi = {
  getCards: async (year: number, month: number) => {
    const { data } = await api.get<ColumnCardsResponse>(
      `${basePath}/columns/${year}/${month}/cards`,
    );
    return data;
  },
  createCard: async (payload: { column_id: number; order: number; title?: string }) => {
    const { data } = await api.post<Card>(`${basePath}/cards`, payload);
    return data;
  },
  getCard: async (id: number) => {
    const { data } = await api.get<CardWithColumn>(`${basePath}/cards/${id}`);
    return data;
  },
  updateTitle: async (id: number, title: string) => {
    const { data } = await api.patch<Card>(`${basePath}/cards/${id}/title`, { title });
    return data;
  },
  updateStatus: async (id: number, status: CardStatus) => {
    const { data } = await api.patch<Card>(`${basePath}/cards/${id}/status`, { status });
    return data;
  },
  updatePosition: async (id: number, payload: { year: number; month: number; order: number }) => {
    const { data } = await api.patch<Card & { column: Column }>(
      `${basePath}/cards/${id}/position`,
      payload,
    );
    return data;
  },
  removeCard: async (id: number) => {
    await api.delete(`${basePath}/cards/${id}`);
  },
};
