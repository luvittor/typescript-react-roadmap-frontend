import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { LoginForm } from "./features/auth/components/LoginForm";
import { RegisterForm } from "./features/auth/components/RegisterForm";
import { Board } from "./features/board/components/Board";
import { useAuthStore } from "./store/auth-store";
import { Button } from "./components/ui/button";
import { Toaster } from "sonner";
import { useLogout } from "./features/auth/hooks/useAuth";
import { LocateFixed, LogOut } from "lucide-react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-xl">
      {children}
    </div>
  </div>
);

const AppLayout = ({ children, showCurrentMonthShortcut }: { children: React.ReactNode; showCurrentMonthShortcut: boolean }) => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <header className="flex items-center justify-between border-b border-border px-5 py-3 sm:px-8">
      <div className="flex items-center gap-2">
        <img src={`${import.meta.env.BASE_URL}roadmap-mark.svg`} alt="" className="h-10 w-10 object-contain" />
        <span className="text-lg font-semibold">Roadmap</span>
        {showCurrentMonthShortcut && (
          <Button asChild variant="outline" size="icon">
            <a href="#roadmap-current-month" aria-label="Go to current month" title="Go to current month">
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>
      <LogoutButton />
    </header>
    <main className="flex flex-1 flex-col px-0 py-0">{children}</main>
  </div>
);

const BoardPage = () => {
  const [isCurrentMonthOutside, setIsCurrentMonthOutside] = useState(false);

  return (
    <AppLayout showCurrentMonthShortcut={isCurrentMonthOutside}>
      <Board onCurrentMonthOutsideChange={setIsCurrentMonthOutside} />
    </AppLayout>
  );
};

const LogoutButton = () => {
  const token = useAuthStore((state) => state.token);
  const { mutate, isPending } = useLogout();
  if (!token) return null;
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => mutate()}
      disabled={isPending}
      aria-label={isPending ? "Signing out" : "Sign out"}
      title={isPending ? "Signing out" : "Sign out"}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) {
    return null;
  }

  if (token) {
    return <Navigate to="/board" replace />;
  }

  return <>{children}</>;
};

export const App = () => {
  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <AuthLayout>
                <div className="mb-6 space-y-2 text-center">
                  <h1 className="text-2xl font-semibold">Welcome</h1>
                  <p className="text-sm text-muted-foreground">Sign in to access your roadmap.</p>
                </div>
                <LoginForm />
              </AuthLayout>
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <AuthLayout>
                <div className="mb-6 space-y-2 text-center">
                  <h1 className="text-2xl font-semibold">Create account</h1>
                  <p className="text-sm text-muted-foreground">Start tracking your plans.</p>
                </div>
                <RegisterForm />
              </AuthLayout>
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/board"
          element={
            <RequireAuth>
              <BoardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
};

export default App;
