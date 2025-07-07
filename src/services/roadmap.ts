import { get, post, patch, del, getText } from '../api';

export interface RegisterResponse {
  token: string;
  user: { id: number; email: string };
}

export type LoginResponse = RegisterResponse;

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: number;
  year: number;
  month: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export type CardStatus = 'not_started' | 'in_progress' | 'completed';

export interface Card {
  id: number;
  column_id: number;
  order: number;
  title: string;
  status: CardStatus;
  created_at: string;
  updated_at: string;
  column?: Column;
}

export interface CardsResponse {
  column: Column;
  cards: Card[];
}

export function ping(): Promise<string> {
  return getText('ping');
}

export function register(data: { name: string; email: string; password: string }): Promise<RegisterResponse> {
  return post<RegisterResponse>('api/v1/register', data, { headers: { Accept: 'application/json' } });
}

export function login(data: { email: string; password: string }): Promise<LoginResponse> {
  return post<LoginResponse>('api/v1/login', data, { headers: { Accept: 'application/json' } });
}

export function logout(token: string): Promise<{ message: string }> {
  return post<{ message: string }>('api/v1/logout', {}, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function getUser(token: string): Promise<UserResponse> {
  return get<UserResponse>('api/v1/user', {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function pingAuth(token: string): Promise<{ message: string }> {
  return get<{ message: string }>('api/v1/ping-auth', {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function getCards(year: number, month: number, token: string): Promise<CardsResponse> {
  return get<CardsResponse>(`api/v1/columns/${year}/${month}/cards`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function createCard(data: { column_id: number; order: number; title?: string }, token: string): Promise<Card> {
  return post<Card>('api/v1/cards', data, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function showCard(id: number, token: string): Promise<Card> {
  return get<Card>(`api/v1/cards/${id}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function updateCardTitle(id: number, title: string, token: string): Promise<Card> {
  return patch<Card>(`api/v1/cards/${id}/title`, { title }, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function updateCardStatus(id: number, status: CardStatus, token: string): Promise<Card> {
  return patch<Card>(`api/v1/cards/${id}/status`, { status }, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function updateCardPosition(id: number, data: { year: number; month: number; order: number }, token: string): Promise<Card> {
  return patch<Card>(`api/v1/cards/${id}/position`, data, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}

export function deleteCard(id: number, token: string): Promise<void> {
  return del<void>(`api/v1/cards/${id}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
}
