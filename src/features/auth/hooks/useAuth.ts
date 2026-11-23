import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { authApi } from "../api";
import { useAuthStore } from "../../../store/auth-store";

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object" || !("response" in error)) return fallback;
  const response = error.response;
  if (!response || typeof response !== "object" || !("data" in response)) return fallback;
  const data = response.data;
  if (!data || typeof data !== "object" || !("message" in data)) return fallback;
  return typeof data.message === "string" ? data.message : fallback;
};

export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.token, data.user);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Welcome back!");
      navigate("/board");
    },
    onError: (error) => toast.error(getAuthErrorMessage(error, "Unable to login")),
  });
};

export const useRegister = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.token, data.user);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Account created");
      navigate("/board");
    },
    onError: (error) => toast.error(getAuthErrorMessage(error, "Unable to register")),
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success("Signed out");
      navigate("/login");
    },
  });
};
