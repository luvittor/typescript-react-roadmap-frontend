import type { CardStatus } from "../../utils/status";

export type CardColor = "slate" | "teal" | "green" | "yellow" | "blue";

export interface Column {
  id: number;
  year: number;
  month: number;
  user_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface Card {
  pendingCreation?: boolean;
  id: number;
  column_id: number;
  order: number;
  title: string;
  status: CardStatus;
  color?: CardColor;
  created_at?: string;
  updated_at?: string;
}

export interface CardWithColumn extends Card {
  column: Column;
}

export interface ColumnCardsResponse {
  column: Column | null;
  cards: Card[];
}
