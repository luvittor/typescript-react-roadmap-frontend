import { Slot } from "@radix-ui/react-slot";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "monthly-roadmap-theme";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored) return stored;
    return "dark";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove(theme === "dark" ? "light" : "dark");
    document.documentElement.classList.add(theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);
  const contextValue = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <Slot>{children}</Slot>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
