import { QueryClientProvider as TanstackQueryProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

import { queryClient } from "../../lib/query-client";

export const QueryProvider = ({ children }: { children: ReactNode }) => (
  <TanstackQueryProvider client={queryClient}>
    {children}
    <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
  </TanstackQueryProvider>
);
