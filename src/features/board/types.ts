import type { CardStatus } from "../../utils/status";

export interface Column {
  id: number;
  year: number;
  month: number;
  user_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface Card {
  id: number;
  column_id: number;
  order: number;
  title: string;
  status: CardStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CardWithColumn extends Card {
  column: Column;
}

export interface ColumnCardsResponse {
  column: Column;
  cards: Card[];
}
