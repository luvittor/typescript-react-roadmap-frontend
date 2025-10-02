import { create } from "zustand";

export type AuthUser = {
  id: number;
  email: string;
  name?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  hydrate: () => void;
};

const STORAGE_KEY = "monthly-roadmap-auth";

const readPersisted = (): { token: string | null; user: AuthUser | null } => {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { token: null, user: null };
    return JSON.parse(stored) as { token: string | null; user: AuthUser | null };
  } catch (error) {
    console.warn("Failed to parse auth storage", error);
    window.localStorage.removeItem(STORAGE_KEY);
    return { token: null, user: null };
  }
};

const persist = (token: string | null, user: AuthUser | null) => {
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  login: (token, user) => {
    persist(token, user);
    set({ token, user });
  },
  logout: () => {
    persist(null, null);
    set({ token: null, user: null });
  },
  setUser: (user) => {
    const token = get().token;
    persist(token, user);
    set({ user });
  },
  hydrate: () => {
    if (get().isHydrated) return;
    const { token, user } = readPersisted();
    set({ token, user, isHydrated: true });
  },
}));
