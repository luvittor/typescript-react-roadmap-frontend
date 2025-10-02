import { api } from "../../lib/http";
import type { AuthUser } from "../../store/auth-store";
import type { AuthResponse, LoginPayload, RegisterPayload } from "./types";

const basePath = "/api/v1";

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<AuthResponse>(`${basePath}/register`, payload);
    return data;
  },
  login: async (payload: LoginPayload) => {
    const { data } = await api.post<AuthResponse>(`${basePath}/login`, payload);
    return data;
  },
  logout: async () => {
    await api.post(`${basePath}/logout`);
  },
  me: async () => {
    const { data } = await api.get<AuthUser>(`${basePath}/user`);
    return data;
  },
  ping: async () => {
    const { data } = await api.get<{ message: string }>(`${basePath}/ping-auth`);
    return data;
  },
};
