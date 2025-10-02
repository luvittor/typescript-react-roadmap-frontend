import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { QueryProvider } from "./app/providers/QueryProvider";
import { AuthProvider } from "./app/providers/AuthProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  </StrictMode>,
);
