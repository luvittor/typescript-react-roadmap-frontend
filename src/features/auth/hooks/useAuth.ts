import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { authApi } from "../api";
import { useAuthStore } from "../../../store/auth-store";

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
    onError: (error: any) => {
      const message = error.response?.data?.message ?? "Unable to login";
      toast.error(message);
    },
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
    onError: (error: any) => {
      const message = error.response?.data?.message ?? "Unable to register";
      toast.error(message);
    },
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
