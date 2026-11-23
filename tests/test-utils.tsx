import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { ReactElement } from "react";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";

import { useAuthStore } from "../src/store/auth-store";

export const renderWithProviders = (
  ui: ReactElement,
  { route = "/", history = createMemoryHistory({ initialEntries: [route] }) } = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  window.history.pushState({}, "Test page", route);

  const result = render(
    <QueryClientProvider client={queryClient}>
      <Router location={history.location} navigator={history}>
        {ui}
      </Router>
    </QueryClientProvider>,
  );

  return { ...result, history };
};

export const resetAuthStore = () => {
  useAuthStore.setState({ token: null, user: null, isHydrated: true });
};
