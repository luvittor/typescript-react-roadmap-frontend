import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { authApi } from "../../features/auth/api";
import { useAuthStore } from "../../store/auth-store";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: isHydrated && Boolean(token),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);

  useEffect(() => {
    if (isHydrated && !token) {
      setUser(null);
    }
  }, [isHydrated, token, setUser]);

  return <>{children}</>;
};
